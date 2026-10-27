import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMidtransServerKey } from "@/lib/midtrans";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Notification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
};

export async function POST(request: Request) {
  let notification: Notification;
  try {
    notification = await request.json() as Notification;
  } catch {
    return NextResponse.json({ error: "Payload not valid." }, { status: 400 });
  }

  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signature } = notification;
  if (!orderId || !statusCode || !grossAmount || !signature) {
    return NextResponse.json({ error: "Notification fields are incomplete." }, { status: 400 });
  }

  try {
    const expected = createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${getMidtransServerKey()}`)
      .digest("hex");
    const expectedBytes = Buffer.from(expected, "hex");
    const receivedBytes = Buffer.from(signature, "hex");
    if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
      return NextResponse.json({ error: "Signature tidak valid." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data: booking, error: lookupError } = await supabase
      .from("bookings")
      .select("deposit_amount, payment_status")
      .eq("midtrans_order_id", orderId)
      .maybeSingle();
    if (lookupError || !booking) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    if (Number(grossAmount) !== Number(booking.deposit_amount)) {
      return NextResponse.json({ error: "Nilai pembayaran tidak sesuai booking." }, { status: 400 });
    }
    if (booking.payment_status === "paid") return NextResponse.json({ received: true });

    let paymentStatus = "pending";
    if (notification.transaction_status === "settlement" ||
        (notification.transaction_status === "capture" && notification.fraud_status === "accept")) {
      paymentStatus = "paid";
    } else if (["expire", "cancel", "deny"].includes(notification.transaction_status || "")) {
      paymentStatus = "failed";
    }

    const { error: updateError } = await supabase.from("bookings").update({
      payment_status: paymentStatus,
      booking_status: paymentStatus === "paid" ? "payment_received" : paymentStatus,
      payment_type: notification.payment_type || "qris",
      midtrans_transaction_id: notification.transaction_id || undefined,
      updated_at: new Date().toISOString(),
    }).eq("midtrans_order_id", orderId);
    if (updateError) return NextResponse.json({ error: "Booking belum dapat diperbarui." }, { status: 500 });
    return NextResponse.json({ received: true });
  } catch (cause) {
    console.error("Midtrans notification failed:", cause);
    return NextResponse.json({ error: "Notification belum dapat diproses." }, { status: 500 });
  }
}
