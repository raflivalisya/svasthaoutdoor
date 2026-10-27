import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!/^SO-[a-f0-9]{20}$/.test(orderId)) {
    return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
  }
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .select("payment_status")
      .eq("midtrans_order_id", orderId)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ paymentStatus: data.payment_status }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Status booking belum tersedia." }, { status: 503 });
  }
}
