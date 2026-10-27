"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { products, rupiah, type Product } from "@/lib/catalog";

type CartLine = { product: Product; size?: number; quantity: number };
type BookingForm = {
  name: string;
  phone: string;
  email: string;
  location: string;
  date: string;
  time: string;
  days: number;
  address: string;
  social: string;
};
type BookingConfirmation = { reference: string; total: number; whatsappUrl: string };

const emptyForm: BookingForm = {
  name: "", phone: "", email: "", location: "", date: "", time: "",
  days: 1, address: "", social: "",
};

function localDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function Storefront() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number | "">>({});
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [minimumDate, setMinimumDate] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingConfirmation | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0) * form.days,
    [cart, form.days],
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    setMinimumDate(localDateString());
  }, []);

  function addToCart(product: Product) {
    const size = selectedSizes[product.id];
    if (product.sizes && !size) {
      setError(`Pilih ukuran untuk ${product.name} terlebih dahulu.`);
      return;
    }
    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id && line.size === size);
      if (existing) {
        return current.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { product, size: size || undefined, quantity: 1 }];
    });
    setDrawerOpen(true);
  }

  function changeQuantity(productId: string, size: number | undefined, delta: number) {
    setCart((current) => current
      .map((line) => line.product.id === productId && line.size === size
        ? { ...line, quantity: line.quantity + delta }
        : line)
      .filter((line) => line.quantity > 0));
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (cart.length === 0) {
      setError("Keranjang masih kosong. Tambahkan alat yang ingin disewa.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone, email: form.email, address: form.address, social: form.social },
          pickup: { location: form.location, date: form.date, time: form.time, days: form.days },
          items: cart.map(({ product, size, quantity }) => ({ productId: product.id, size, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pesanan belum dapat dibuat.");
      setBooking({ reference: result.reference, total: result.total, whatsappUrl: result.whatsappUrl });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kendala saat membuat pesanan.");
    } finally {
      setBusy(false);
    }
  }

  function updateForm<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285835484908";

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Svastha Outdoor, beranda">
          <span className="brand-mark">S</span>
          <span>SVASTHA<span className="brand-accent">OUTDOOR</span><small>RENTAL GEAR · LAMPUNG</small></span>
        </a>
        <nav className="main-nav" aria-label="Navigasi utama">
          <a href="#katalog">Katalog</a><a href="#tentang">Tentang kami</a><a href="#lokasi">Lokasi</a>
        </nav>
        <div className="header-actions">
          <a className="header-chat" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">Chat admin <span>↗</span></a>
          <button className="cart-trigger" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Buka keranjang, ${itemCount} item`}>
            <span className="cart-icon">Bag</span><span className="cart-badge">{itemCount}</span>
          </button>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-image" role="img" aria-label="Suasana berkemah di alam terbuka" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="eyebrow eyebrow-light"><span /> BASECAMP LAMPUNG</p>
            <h1>Jalan lebih jauh.<br /><em>Siapkan sisanya.</em></h1>
            <p className="hero-copy">Perlengkapan outdoor terawat untuk perjalanan yang terasa lebih ringan. Ambil di Kemiling atau Natar.</p>
            <div className="hero-actions">
              <a className="button button-lime" href="#katalog">Jelajahi perlengkapan <span>↘</span></a>
              <a className="text-link text-link-light" href="#tentang">Kenali Svastha <span>→</span></a>
            </div>
          </div>
          <div className="hero-note"><span className="note-line" /> SEWA HARIAN · LAMPUNG</div>
          <div className="hero-index">01 <span>/</span> OUTDOOR RENTAL</div>
        </section>

        <section className="trust-strip" aria-label="Keunggulan Svastha Outdoor">
          <div><span className="trust-number">01</span><p>Gear terawat<small>Siap menemani perjalanan</small></p></div>
          <div><span className="trust-number">02</span><p>Pilihan lengkap<small>Dari daypack sampai tenda</small></p></div>
          <div><span className="trust-number">03</span><p>Ambil fleksibel<small>Kemiling atau Natar</small></p></div>
          <div className="trust-side">PERJALANANMU<br />DIMULAI DI SINI <span>↗</span></div>
        </section>

        <section className="catalog-section" id="katalog">
          <div className="section-heading">
            <div><p className="eyebrow"><span /> PERLENGKAPAN PILIHAN</p><h2>Temukan gear<br />untuk langkahmu.</h2></div>
            <p className="section-intro">Pilih perlengkapan yang kamu butuhkan. Harga sewa dihitung per hari; admin akan mengonfirmasi ketersediaan dan pembayaran lewat WhatsApp.</p>
          </div>
          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product-card" key={product.id}>
                <div className="product-photo">
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw" priority={index < 2} />
                  <span className="product-category">{product.category}</span>
                  <span className="product-number">0{index + 1}</span>
                </div>
                <div className="product-info">
                  <div className="product-title-row"><h3>{product.name}</h3><span className="product-arrow">↗</span></div>
                  <p>{product.description}</p>
                  {product.sizes && <label className="size-select">Ukuran sepatu
                    <select value={selectedSizes[product.id] || ""} onChange={(event) => setSelectedSizes((sizes) => ({ ...sizes, [product.id]: event.target.value ? Number(event.target.value) : "" }))}>
                      <option value="">Pilih ukuran</option>{product.sizes.map((size) => <option value={size} key={size}>EU {size}</option>)}
                    </select>
                  </label>}
                  <div className="product-buy"><div><span className="price-label">HARGA / HARI</span><strong>{rupiah(product.price)}</strong></div>
                    <button type="button" className="add-button" onClick={() => addToCart(product)} aria-label={`Tambahkan ${product.name} ke keranjang`}>+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="tentang">
          <div className="about-image"><Image src="/img/about.jpg" alt="Petualang menikmati perjalanan di alam" fill sizes="(max-width: 800px) 100vw, 48vw" /></div>
          <div className="about-copy"><p className="eyebrow eyebrow-light"><span /> TENTANG SVASTHA</p><h2>Lebih banyak<br /><em>cerita di luar.</em></h2>
            <p>Kami percaya petualangan yang berkesan dimulai dari persiapan yang tepat. Sewa perlengkapan yang kamu perlukan, lalu fokus menikmati perjalanan.</p>
            <a className="text-link text-link-light" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">Tanya ketersediaan <span>→</span></a>
          </div>
          <div className="about-vertical">SVASTHA OUTDOOR · LAMPUNG</div>
        </section>

        <section className="pickup-section" id="lokasi">
          <div><p className="eyebrow"><span /> RENCANAKAN PENGAMBILAN</p><h2>Dua titik. Satu awal<br />petualangan.</h2></div>
          <div className="pickup-locations"><article><span>01 / KEMILING</span><h3>Area Kemiling</h3><p>Detail alamat dan jadwal pengambilan akan dikonfirmasi admin.</p></article>
            <article><span>02 / NATAR</span><h3>Area Natar</h3><p>Pilih lokasi ini saat booking, lalu admin akan menghubungimu.</p></article></div>
        </section>

        <section className="closing-cta"><p className="eyebrow eyebrow-light"><span /> READY WHEN YOU ARE</p><h2>Gunungnya menunggu.</h2><a className="button button-lime" href="#katalog">Pilih perlengkapan <span>↗</span></a></section>
      </main>

      <footer className="site-footer"><a className="brand brand-footer" href="#home"><span className="brand-mark">S</span><span>SVASTHA<span className="brand-accent">OUTDOOR</span><small>RENTAL GEAR · LAMPUNG</small></span></a>
        <p>Perjalanan baik dimulai dari persiapan yang baik.</p><span>© {new Date().getFullYear()} Svastha Outdoor</span></footer>

      {drawerOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
        <aside className="booking-drawer" role="dialog" aria-modal="true" aria-label="Keranjang dan formulir penyewaan">
          <div className="drawer-top"><div><p className="eyebrow"><span /> BOOKING PERLENGKAPAN</p><h2>{booking ? "Booking tersimpan" : "Detail sewa"}</h2></div><button type="button" className="close-button" onClick={() => setDrawerOpen(false)} aria-label="Tutup keranjang">×</button></div>
          {booking ? <div className="confirmation-panel">
            <p className="confirmation-intro">Detail booking sudah disimpan. Lanjutkan ke WhatsApp agar admin dapat mengonfirmasi ketersediaan alat dan informasi pembayaran.</p>
            <div className="booking-receipt"><span>REFERENSI BOOKING</span><strong>{booking.reference}</strong><small>Estimasi sewa · {rupiah(booking.total)}</small></div>
            <a className="button button-dark full-button" href={booking.whatsappUrl} target="_blank" rel="noreferrer">Lanjutkan ke WhatsApp <span>↗</span></a>
            <p className="confirmation-note">Pembayaran belum dilakukan di website. Admin akan memberi petunjuk setelah mengecek booking.</p>
            <button className="button button-outline full-button" type="button" onClick={() => { setBooking(null); setCart([]); setForm(emptyForm); }}>Buat booking lain</button>
          </div> : <>
            <div className="cart-list">
              {cart.length === 0 ? <p className="empty-cart">Keranjangmu masih kosong.<br />Pilih gear dari katalog untuk mulai.</p> : cart.map((line) => (
                <div className="cart-line" key={`${line.product.id}-${line.size || "one"}`}>
                  <div className="cart-thumb"><Image src={line.product.image} alt="" fill sizes="64px" /></div>
                  <div className="cart-line-copy"><strong>{line.product.name}</strong><span>{line.size ? `Ukuran EU ${line.size} · ` : ""}{rupiah(line.product.price)} / hari</span>
                    <div className="quantity-control"><button type="button" onClick={() => changeQuantity(line.product.id, line.size, -1)} aria-label="Kurangi jumlah">−</button><span>{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.product.id, line.size, 1)} aria-label="Tambah jumlah">+</button></div>
                  </div>
                  <strong className="line-total">{rupiah(line.product.price * line.quantity)}</strong>
                </div>
              ))}
            </div>
            <form className="booking-form" onSubmit={createBooking}>
              <h3>Data penyewa</h3>
              <label>Nama lengkap<input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Nama sesuai identitas" /></label>
              <label>Nomor WhatsApp<input required type="tel" maxLength={24} autoComplete="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="08xx xxxx xxxx" /></label>
              <label>Email <span className="optional-label">opsional</span><input type="email" maxLength={120} autoComplete="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="nama@email.com" /></label>
              <label>Lokasi pengambilan<select required value={form.location} onChange={(event) => updateForm("location", event.target.value)}><option value="">Pilih lokasi</option><option value="Kemiling">Area Kemiling</option><option value="Natar">Area Natar</option></select></label>
              <div className="form-pair"><label>Tanggal ambil<input required type="date" min={minimumDate} value={form.date} onChange={(event) => updateForm("date", event.target.value)} /></label><label>Jam ambil<input required type="time" value={form.time} onChange={(event) => updateForm("time", event.target.value)} /></label></div>
              <label>Durasi sewa<select value={form.days} onChange={(event) => updateForm("days", Number(event.target.value))}>{Array.from({ length: 14 }, (_, i) => i + 1).map((days) => <option value={days} key={days}>{days} {days === 1 ? "hari" : "hari"}</option>)}</select></label>
              <label>Alamat domisili<textarea required maxLength={500} rows={2} value={form.address} onChange={(event) => updateForm("address", event.target.value)} placeholder="Alamat lengkap" /></label>
              <label>Instagram / Facebook <span className="optional-label">opsional</span><input maxLength={100} value={form.social} onChange={(event) => updateForm("social", event.target.value)} placeholder="@username" /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="estimate"><span>Estimasi total sewa</span><strong>{rupiah(total)}</strong><small>Belum termasuk biaya lain yang mungkin dikonfirmasi admin.</small></div>
              <p className="form-note">Data ini digunakan untuk mengelola booking dan disimpan di Supabase. Admin akan mengonfirmasi ketersediaan alat dan pembayaran lewat WhatsApp.</p>
              <button className="button button-dark full-button" type="submit" disabled={busy || cart.length === 0}>{busy ? "Menyimpan booking…" : "Simpan booking & lanjut WhatsApp"}<span>↗</span></button>
            </form>
          </>}
        </aside>
      </div>}
    </>
  );
}
