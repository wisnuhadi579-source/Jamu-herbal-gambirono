# Prompt untuk Google AI Studio Build Mode

Saya mengimpor repository Jamu Herbal. Audit seluruh file sebelum mengubah kode.

Project ini adalah aplikasi penjualan dan stok usaha jamu berbasis React + Vite + TypeScript + Supabase, ditargetkan untuk GitHub dan Cloudflare Pages (static frontend, output dist).

Tugas:
1. Periksa struktur, package.json, TypeScript, dan build.
2. Pertahankan modul Ringkasan, Transaksi penjualan, Barang & stok, Riwayat transaksi, Laporan, dan Pengaturan & cadangan.
3. Periksa integrasi Supabase dan cocokkan query dengan `supabase/schema.sql`.
4. Jangan menambahkan service_role key atau secret ke frontend.
5. Tinjau RLS dengan aman. Jangan membuat kebijakan akses publik tanpa pembatasan. Sebelum membuat kebijakan final, tanyakan apakah aplikasi single-owner atau multi-user.
6. Pastikan `npm run build` berhasil dan deployment Cloudflare Pages memakai `npm run build` + output `dist`.
7. Perbaiki aksesibilitas, validasi form, loading/error states, dan responsivitas.
8. Jangan menghapus fitur tanpa alasan dan jangan mengarang bahwa tes telah lulus jika belum dijalankan.
9. Laporkan file yang diubah, hasil pemeriksaan, konfigurasi yang masih diperlukan, dan langkah berikutnya.

Penting: ini merupakan rekonstruksi, bukan source code asli situs publik. Jangan mengklaim telah memigrasikan data lama. Minta file ekspor atau akses data yang sah jika migrasi data diperlukan.
