import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthorizedAdmin();
  if (auth.response) return auth.response;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .select("booking_reference, customer_info, pickup_location, pickup_date, pickup_time, rental_days, line_items, total_amount, booking_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ bookings: data || [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (cause) {
    console.error("Admin booking list failed:", cause);
    return NextResponse.json({ error: "Daftar booking belum dapat dimuat. Periksa schema Supabase." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthorizedAdmin();
  if (auth.response) return auth.response;

  let body: { reference?: unknown; status?: unknown };
  try {
    body = await request.json() as { reference?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const reference = typeof body.reference === "string" ? body.reference : "";
  const status = body.status;
  if (!/^SO-[A-F0-9]{12}$/.test(reference) || !["confirmed", "cancelled", "completed"].includes(String(status))) {
    return NextResponse.json({ error: "Referensi atau status booking tidak valid." }, { status: 400 });
  }

  const currentStatuses = status === "confirmed"
    ? ["pending_admin_confirmation"]
    : status === "cancelled"
      ? ["pending_admin_confirmation", "confirmed"]
      : ["confirmed"];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bookings")
      .update({ booking_status: status })
      .eq("booking_reference", reference)
      .in("booking_status", currentStatuses)
      .select("booking_reference, booking_status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Status booking sudah berubah. Muat ulang daftar." }, { status: 409 });
    return NextResponse.json({ booking: data });
  } catch (cause) {
    console.error("Admin booking update failed:", cause);
    return NextResponse.json({ error: "Status booking belum dapat diperbarui." }, { status: 503 });
  }
}
