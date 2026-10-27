import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseSession } from "@/lib/supabase-session";

export async function getAuthorizedAdmin() {
  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return { user: null, response: NextResponse.json({ error: "ADMIN_EMAILS belum dikonfigurasi." }, { status: 503 }) };
  }

  const supabase = await getSupabaseSession();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: "Silakan masuk sebagai admin." }, { status: 401 }) };
  }

  if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
    return { user: null, response: NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 }) };
  }

  return { user, response: null };
}
