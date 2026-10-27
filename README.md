# Svastha Outdoor

Website rental perlengkapan outdoor Lampung, dibangun dengan Next.js App Router. Katalog awal berasal dari situs statis di repo ini; foto produk tersedia di `public/img`.

## Menjalankan secara lokal

1. Instal Node.js 20.9 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi Supabase dan Midtrans.
4. Jalankan SQL di `supabase/schema.sql` pada SQL Editor project Supabase.
5. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

## Konfigurasi

- `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: secret/service-role key Supabase. Hanya dipakai oleh route server; jangan beri prefix `NEXT_PUBLIC_` atau commit nilainya.
- `MIDTRANS_SERVER_KEY`: Server Key Midtrans. Jangan pernah mengirimkannya ke browser atau commit nilainya.
- `MIDTRANS_IS_PRODUCTION`: gunakan `false` untuk Sandbox; ubah ke `true` setelah kredensial dan akun production siap.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: nomor admin internasional tanpa tanda `+`.

Tambahkan callback Midtrans di dashboard ke `https://<domain>/api/payments/notification`. Callback lokal memerlukan URL publik yang dapat dijangkau Midtrans. QRIS DP dibuat dari server dan nilai booking dihitung ulang dari katalog server, bukan dari harga yang dikirim browser.

## Alur booking

Pengunjung memilih gear, mengisi data penyewa dan pengambilan, lalu membuat QRIS untuk DP minimal 50%. Booking disimpan di Supabase sebagai pending. Midtrans mengirim notifikasi pembayaran ke route callback; status menjadi payment received setelah tanda tangan notifikasi valid dan jumlah pembayaran cocok.

Booking menunggu konfirmasi admin soal ketersediaan alat. Contoh ini belum melakukan penguncian stok berdasarkan tanggal.
