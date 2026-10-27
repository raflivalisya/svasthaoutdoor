import { NextResponse } from "next/server";
import { products } from "@/lib/catalog";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { midtransApiUrl, midtransAuthorization } from "@/lib/midtrans";

export const runtime = "nodejs";

type BookingRequest = {
  customer?: { name?: string; phone?: string; email?: string; address?: string; social?: string };
  pickup?: { location?: string; date?: string; time?: string; days?: number };
  items?: Array<{ productId?: string; size?: number; quantity?: number }>;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: BookingRequest;
  try {
    body = await request.json() as BookingRequest;
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const customer = {
    name: text(body.customer?.name, 100),
    phone: text(body.customer?.phone, 24),
    email: text(body.customer?.email, 120),
    address: text(body.customer?.address, 500),
    social: text(body.customer?.social, 100),
  };
  const location = text(body.pickup?.location, 30);
  const date = text(body.pickup?.date, 10);
  const time = text(body.pickup?.time, 5);
  const days = Number(body.pickup?.days);
  const requestedItems = body.items;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const dateIsValid = !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
  const todayInJakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  if (!customer.name || !customer.phone || !customer.address || !["Kemiling", "Natar"].includes(location) ||
      !dateIsValid || date < todayInJakarta || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !Number.isInteger(days) || days < 1 || days > 14 || !Array.isArray(requestedItems) ||
      requestedItems.length < 1 || requestedItems.length > 20) {
    return NextResponse.json({ error: "Periksa kembali data penyewa, pengambilan, durasi, dan alat." }, { status: 400 });
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (customer.phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Nomor WhatsApp belum valid." }, { status: 400 });
  }

  const lineItems = [];
  for (const requested of requestedItems) {
    const product = products.find((candidate) => candidate.id === requested.productId);
    const quantity = Number(requested.quantity);
    const size = requested.size === undefined ? undefined : Number(requested.size);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
        (product.sizes && (!size || !product.sizes.includes(size))) || (!product.sizes && size !== undefined)) {
      return NextResponse.json({ error: "Ada item atau ukuran yang tidak valid di keranjang." }, { status: 400 });
    }
    lineItems.push({ productId: product.id, name: product.name, size: size ?? null, quantity, unitPrice: product.price });
  }

  const total = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * days;
  const deposit = Math.ceil(total / 2);
  const orderId = `SO-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

  try {
    const authorization = midtransAuthorization();
    const supabase = getSupabaseAdmin();
    const { error: insertError } = await supabase.from("bookings").insert({
      midtrans_order_id: orderId,
      customer_info: customer,
      pickup_location: location,
      pickup_date: date,
      pickup_time: time,
      rental_days: days,
      line_items: lineItems,
      total_amount: total,
      deposit_amount: deposit,
    });
    if (insertError) throw new Error("Booking belum tersimpan. Pastikan schema Supabase sudah diterapkan.");

    const firstAndLast = customer.name.split(/\s+/);
    const firstName = firstAndLast.shift() || customer.name;
    const lastName = firstAndLast.join(" ");
    const midtransResponse = await fetch(midtransApiUrl("/v2/charge"), {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: orderId, gross_amount: deposit },
        item_details: [{ id: "booking-deposit", price: deposit, quantity: 1, name: `DP sewa Svastha (${days} hari)` }],
        customer_details: {
          first_name: firstName,
          ...(lastName ? { last_name: lastName } : {}),
          ...(customer.email ? { email: customer.email } : {}),
          phone: customer.phone,
        },
        qris: { acquirer: "gopay" },
      }),
    });
    const payment = await midtransResponse.json();
    if (!midtransResponse.ok || !payment.transaction_id) {
      await supabase.from("bookings").update({ payment_status: "failed", booking_status: "payment_failed" }).eq("midtrans_order_id", orderId);
      return NextResponse.json({ error: "Midtrans belum dapat membuat QRIS. Coba lagi atau hubungi admin." }, { status: 502 });
    }

    const { error: updateError } = await supabase.from("bookings").update({
      midtrans_transaction_id: payment.transaction_id,
      payment_type: payment.payment_type || "qris",
    }).eq("midtrans_order_id", orderId);
    if (updateError) throw new Error("QRIS dibuat, tetapi status booking belum tersimpan. Hubungi admin sebelum mencoba membayar ulang.");

    return NextResponse.json({ orderId, total, deposit }, { status: 201 });
  } catch (cause) {
    console.error("Booking creation failed:", cause);
    const message = cause instanceof Error && cause.message.includes("belum tersimpan")
      ? cause.message
      : "Booking belum dapat dibuat. Periksa konfigurasi server lalu coba lagi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
