import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { midtransApiUrl, midtransAuthorization } from "@/lib/midtrans";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!/^SO-[a-f0-9]{20}$/.test(orderId)) return new NextResponse("Booking tidak ditemukan.", { status: 404 });

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .select("midtrans_transaction_id")
      .eq("midtrans_order_id", orderId)
      .maybeSingle();
    if (error || !data?.midtrans_transaction_id) return new NextResponse("QRIS belum tersedia.", { status: 404 });

    const qrResponse = await fetch(midtransApiUrl(`/v2/qris/${encodeURIComponent(data.midtrans_transaction_id)}/qr-code`), {
      headers: { Authorization: midtransAuthorization(), Accept: "image/png" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!qrResponse.ok) return new NextResponse("QRIS belum dapat dimuat.", { status: 502 });
    return new NextResponse(await qrResponse.arrayBuffer(), {
      headers: {
        "Content-Type": qrResponse.headers.get("content-type") || "image/png",
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("QRIS belum dapat dimuat.", { status: 503 });
  }
}
