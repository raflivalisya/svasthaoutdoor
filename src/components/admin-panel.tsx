"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { rupiah } from "@/lib/catalog";

type BookingItem = { name: string; quantity: number; size: number | null; unitPrice: number };
type Booking = {
  booking_reference: string;
  customer_info: { name?: string; phone?: string; email?: string; address?: string; social?: string };
  pickup_location: string;
  pickup_date: string;
  pickup_time: string;
  rental_days: number;
  line_items: BookingItem[];
  total_amount: number;
  booking_status: string;
  created_at: string;
};
type ViewState = "loading" | "signed_out" | "forbidden" | "ready" | "error";

const statusLabels: Record<string, string> = {
  pending_admin_confirmation: "Perlu konfirmasi",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getItems(items: BookingItem[]) {
  if (!Array.isArray(items)) return "Rincian alat tidak tersedia";
  return items.map((item) => `${item.name}${item.size ? ` (EU ${item.size})` : ""} ×${item.quantity}`).join(", ");
}

export default function AdminPanel() {
  const [view, setView] = useState<ViewState>("loading");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadBookings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (response.status === 401) { setView("signed_out"); return "signed_out" as const; }
      if (response.status === 403) { setView("forbidden"); return "forbidden" as const; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Dashboard belum dapat dimuat.");
      setBookings(result.bookings);
      setView("ready");
      setMessage("");
      return "ready" as const;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Dashboard belum dapat dimuat.");
      setView("error");
      return "error" as const;
    }
  }, []);

  useEffect(() => { void loadBookings(); }, [loadBookings]);

  const stats = useMemo(() => ({
    pending: bookings.filter((booking) => booking.booking_status === "pending_admin_confirmation").length,
    active: bookings.filter((booking) => booking.booking_status === "confirmed").length,
    complete: bookings.filter((booking) => booking.booking_status === "completed").length,
  }), [bookings]);

  const visibleBookings = filter === "all"
    ? bookings
    : bookings.filter((booking) => booking.booking_status === filter);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setMessage("Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local, lalu mulai ulang server.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("Email atau kata sandi tidak cocok.");
      setBusy(false);
      return;
    }
    const nextView = await loadBookings();
    if (nextView === "forbidden") await supabase.auth.signOut();
    setPassword("");
    setBusy(false);
  }

  async function signOut() {
    await getSupabaseBrowser()?.auth.signOut();
    setBookings([]);
    setView("signed_out");
  }

  async function changeStatus(reference: string, status: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Status booking belum dapat diperbarui.");
      setBookings((current) => current.map((booking) => booking.booking_reference === reference
        ? { ...booking, booking_status: result.booking.booking_status }
        : booking));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Status booking belum dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "loading") return <main className="admin-loading"><span className="admin-loader" />Memuat dashboard…</main>;

  if (view !== "ready") return (
    <main className="admin-login-wrap">
      <a className="admin-back-link" href="/">← Kembali ke website</a>
      <section className="admin-login-card">
        <div className="admin-login-mark">S</div>
        <p className="admin-kicker">AREA KHUSUS TIM</p>
        <h1>{view === "forbidden" ? "Akun belum diizinkan" : "Masuk ke Svastha"}</h1>
        <p className="admin-login-copy">Dashboard pesanan untuk tim Svastha Outdoor.</p>
        {view === "forbidden" ? <>
          <p className="admin-alert">Email ini belum ada di daftar admin. Gunakan akun yang sudah ditambahkan ke <code>ADMIN_EMAILS</code>.</p>
          <button className="admin-primary-button" type="button" onClick={() => { void signOut(); }}>Keluar dari akun</button>
        </> : <form onSubmit={signIn}>
          <label>Email admin<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@domain.com" /></label>
          <label>Kata sandi<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Kata sandi Supabase Auth" /></label>
          {message && <p className="admin-alert" role="alert">{message}</p>}
          {view === "error" && <button className="admin-secondary-button" type="button" onClick={() => { void loadBookings(); }}>Coba muat ulang</button>}
          <button className="admin-primary-button" type="submit" disabled={busy}>{busy ? "Memeriksa akun…" : "Masuk ke dashboard"}<span>→</span></button>
        </form>}
        <p className="admin-login-foot">Akses pesanan dibatasi untuk email di allowlist admin.</p>
      </section>
    </main>
  );

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <a className="admin-brand" href="/" aria-label="Svastha Outdoor"><span className="admin-logo">S</span><strong>SVASTHA<span>OUTDOOR</span></strong></a>
        <div className="admin-topbar-center"><span className="admin-live-dot" /> PANEL ADMIN <span className="admin-divider">/</span> OPERASIONAL</div>
        <div className="admin-topbar-actions"><span className="admin-live-status"><i /> Online</span><button className="admin-avatar" type="button" onClick={() => { void signOut(); }} aria-label="Keluar dari dashboard">S</button></div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-side-label">TOKO</div>
          <a className="admin-side-link active" href="#dashboard"><span className="side-icon">⌂</span> Ringkasan</a>
          <a className="admin-side-link" href="#pesanan"><span className="side-icon">▣</span> Pesanan <b>{stats.pending}</b></a>
          <div className="admin-side-label">AKUN</div>
          <a className="admin-side-link" href="/" target="_blank" rel="noreferrer"><span className="side-icon">↗</span> Lihat website</a>
          <button className="admin-side-link side-logout" type="button" onClick={() => { void signOut(); }}><span className="side-icon">⇥</span> Keluar</button>
          <div className="admin-side-help"><strong>Butuh bantuan?</strong><span>Atur email admin di konfigurasi Supabase.</span></div>
        </aside>

        <main className="admin-main" id="dashboard">
          <section className="admin-welcome">
            <div><p className="admin-kicker">SVASTHA OUTDOOR · LAMPUNG</p><h1>Halo, tim Svastha! <span>👋</span></h1><p>Pantau booking baru dan kelola jadwal pengambilan alat.</p><a href="#pesanan" className="admin-welcome-button">Lihat pesanan <span>↓</span></a></div>
            <div className="welcome-sticker" aria-hidden="true"><span>⛰</span><small>READY<br />TO EXPLORE</small></div>
            <div className="welcome-spark spark-one">✦</div><div className="welcome-spark spark-two">✦</div>
          </section>

          <section className="admin-stats" aria-label="Ringkasan pesanan">
            <article className="admin-stat stat-pending"><div className="stat-top"><span>Perlu konfirmasi</span><b>!</b></div><strong>{stats.pending}</strong><small>Menunggu dicek admin</small><span className="stat-doodle">◷</span></article>
            <article className="admin-stat stat-active"><div className="stat-top"><span>Pesanan aktif</span><b>↗</b></div><strong>{stats.active}</strong><small>Booking sudah dikonfirmasi</small><span className="stat-doodle">⌁</span></article>
            <article className="admin-stat stat-complete"><div className="stat-top"><span>Pesanan selesai</span><b>✓</b></div><strong>{stats.complete}</strong><small>Perjalanan yang telah selesai</small><span className="stat-doodle">✳</span></article>
          </section>

          <section className="admin-orders" id="pesanan">
            <div className="orders-heading"><div><p className="admin-kicker">AKTIVITAS TERBARU</p><h2>Daftar pesanan</h2><p>Booking terbaru tersimpan di Supabase.</p></div><button className="admin-refresh" type="button" onClick={() => { void loadBookings(); }}>↻ <span>Muat ulang</span></button></div>
            {message && <p className="admin-alert" role="alert">{message}</p>}
            <div className="order-filters" role="tablist" aria-label="Filter status booking">
              {[{ key: "all", label: "Semua" }, { key: "pending_admin_confirmation", label: "Perlu konfirmasi" }, { key: "confirmed", label: "Dikonfirmasi" }, { key: "completed", label: "Selesai" }].map((item) => <button key={item.key} className={filter === item.key ? "selected" : ""} type="button" role="tab" aria-selected={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
            </div>
            <div className="orders-table-wrap">
              <table className="orders-table"><thead><tr><th>PELANGGAN</th><th>PERLENGKAPAN</th><th>PENGAMBILAN</th><th>TOTAL</th><th>STATUS</th><th>AKSI</th></tr></thead>
                <tbody>{visibleBookings.map((booking) => {
                  const phone = (booking.customer_info?.phone || "").replace(/\D/g, "");
                  return <tr key={booking.booking_reference}>
                    <td><strong>{booking.customer_info?.name || "Pelanggan"}</strong><small>{booking.booking_reference}</small>{phone && <a className="customer-phone" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">{booking.customer_info.phone} ↗</a>}<details className="customer-details"><summary>Info lengkap</summary><div><b>Alamat</b><span>{booking.customer_info?.address || "—"}</span>{booking.customer_info?.email && <><b>Email</b><span>{booking.customer_info.email}</span></>}{booking.customer_info?.social && <><b>Sosial media</b><span>{booking.customer_info.social}</span></>}</div></details></td>
                    <td className="order-items">{getItems(booking.line_items)}</td>
                    <td><strong>{booking.pickup_location}</strong><small>{formatDate(booking.pickup_date)} · {booking.pickup_time}</small><small>{booking.rental_days} hari</small></td>
                    <td className="order-total">{rupiah(booking.total_amount)}</td>
                    <td><span className={`status-pill status-${booking.booking_status}`}>{statusLabels[booking.booking_status] || booking.booking_status}</span></td>
                    <td><div className="order-actions">{booking.booking_status === "pending_admin_confirmation" && <><button className="confirm-action" type="button" disabled={busy} onClick={() => { void changeStatus(booking.booking_reference, "confirmed"); }}>Konfirmasi</button><button className="cancel-action" type="button" disabled={busy} onClick={() => { void changeStatus(booking.booking_reference, "cancelled"); }}>Batal</button></>}{booking.booking_status === "confirmed" && <button className="confirm-action" type="button" disabled={busy} onClick={() => { void changeStatus(booking.booking_reference, "completed"); }}>Tandai selesai</button>}</div></td>
                  </tr>;
                })}</tbody>
              </table>
              {visibleBookings.length === 0 && <div className="orders-empty"><span>☀</span><strong>Belum ada pesanan di sini</strong><small>Booking baru akan muncul di daftar ini.</small></div>}
            </div>
            <p className="admin-table-note">Menampilkan hingga 100 booking terbaru. Booking tidak mengunci stok otomatis.</p>
          </section>
          <footer className="admin-footer">SVASTHA OUTDOOR <span>·</span> PANEL OPERASIONAL</footer>
        </main>
      </div>
    </div>
  );
}
