# Svastha Outdoor

Website rental perlengkapan outdoor Lampung, dibangun dengan Next.js App Router. Katalog awal berasal dari situs statis di repo ini; foto produk tersedia di `public/img`.

Palet warna dan bentuk utama dapat disesuaikan dari token di bagian `:root` pada `src/app/globals.css`.

## Menjalankan secara lokal

1. Instal Node.js 20.9 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi Supabase.
4. Jalankan SQL di `supabase/schema.sql` pada SQL Editor project Supabase.
5. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

## Konfigurasi

- `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: secret/service-role key Supabase. Hanya dipakai oleh route server; jangan beri prefix `NEXT_PUBLIC_` atau commit nilainya.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: nomor admin internasional tanpa tanda `+`.

## Alur booking

Pengunjung memilih gear, mengisi data penyewa dan pengambilan, lalu menyimpan booking. Server menghitung harga dari katalog dan menyimpan data booking di Supabase. Pengunjung kemudian bisa membuka WhatsApp dengan detail pesanan yang sudah disiapkan agar admin mengonfirmasi ketersediaan dan informasi pembayaran.

Pembayaran QRIS belum diaktifkan. Booking juga belum mengunci stok berdasarkan tanggal.
