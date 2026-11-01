# Jamu Herbal — Penjualan & Stok

Starter project hasil rekonstruksi berdasarkan modul yang terlihat pada situs publik:
Ringkasan, Transaksi penjualan, Barang & stok, Riwayat transaksi, Laporan, dan Pengaturan & cadangan.

> Ini bukan salinan source code internal situs asal. URL publik tidak menyediakan source code, konfigurasi backend, atau data privatnya.

## Teknologi

- React + Vite + TypeScript
- Supabase JS client
- Supabase PostgreSQL + RPC untuk transaksi atomik
- CSS responsif
- Cloudflare Pages-ready (`npm run build` menghasilkan `dist/`)

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `.env.local` dengan Supabase Project URL dan publishable key. Jangan pernah masukkan `service_role` key ke variabel `VITE_*` atau ke browser.

## Menyiapkan Supabase

1. Buat project Supabase.
2. Buka SQL Editor dan tinjau lalu jalankan `supabase/schema.sql`.
3. Atur autentikasi dan kebijakan RLS sesuai model pemakaian.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Masukkan data produk melalui UI setelah kebijakan akses siap.

### Penting tentang keamanan

SQL menggunakan RLS dan tidak membuat kebijakan publik yang mengizinkan akses. Ini adalah default aman, tetapi artinya operasi database akan ditolak sampai kebijakan akses yang tepat dibuat. Sebelum dipakai untuk data nyata, tentukan apakah aplikasi hanya untuk satu pemilik atau multi-user, lalu buat kebijakan berbasis autentikasi dan kepemilikan data (`owner_id`). Jangan mengaktifkan akses `anon` tanpa pembatasan.

Fungsi `create_sale` dirancang untuk menyimpan transaksi, detail transaksi, dan mengurangi stok dalam satu transaksi database. Fungsi berjalan sebagai `security invoker`; caller tetap harus memiliki hak akses yang sesuai.

## Deploy Cloudflare Pages

1. Push folder proyek ke repository GitHub.
2. Di Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pilih repository.
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Tambahkan environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Deploy dan tes URL production.

## Import ke Google AI Studio

1. Push repository ke GitHub.
2. Buka Google AI Studio Build mode.
3. Pilih Add files (+) → Import from GitHub.
4. Pilih repository ini.
5. Berikan prompt dari `PROMPT-GOOGLE-AI-STUDIO.md` untuk audit, perbaikan, dan penyempurnaan.

## Fitur starter

- Dashboard ringkasan dan indikator stok rendah
- CRUD barang
- Form transaksi dan keranjang
- Riwayat transaksi
- Laporan ringkas berdasarkan data transaksi
- Ekspor CSV
- Pengaturan dan status koneksi
- Data demo hanya untuk pratinjau saat Supabase belum dikonfigurasi

## Belum termasuk / perlu validasi

- Login dan role admin
- Kebijakan RLS final dan model kepemilikan data
- Import data lama dari aplikasi sebelumnya
- Cetak struk / invoice PDF
- Retur, pembelian stok, koreksi stok, dan audit log
- Backup database penuh
- Pengujian end-to-end dan pengujian production dengan kredensial Supabase nyata

Jangan menganggap data demo sebagai data usaha yang sebenarnya.
