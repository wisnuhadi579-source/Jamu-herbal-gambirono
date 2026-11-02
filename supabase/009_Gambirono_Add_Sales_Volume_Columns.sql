-- ============================================================================
-- Migrasi 009: Gambirono Add Sales Volume Columns
-- ============================================================================
-- Menambahkan kolom jamu_terjual_ml dan restok_ml ke tabel transaksi_penjualan
-- untuk mendukung pelacakan volume (ML) sesuai dengan RPC Migrasi 008.
-- ============================================================================

-- 1. Tambahkan kolom ke public.gambirono_transaksi_penjualan
alter table public.gambirono_transaksi_penjualan 
  add column if not exists jamu_terjual_ml numeric default 0,
  add column if not exists restok_ml numeric default 0;

-- 2. Pastikan kolom ke public.gambirono_mutasi_stok lengkap (Robustness check)
alter table public.gambirono_mutasi_stok 
  add column if not exists stok_sebelumnya numeric default 0,
  add column if not exists stok_terbaru numeric default 0,
  add column if not exists perubahan numeric default 0,
  add column if not exists created_at timestamptz default now();

-- 3. Update metadata versi migrasi
update public.gambirono_jamu_meta set migration_version = '009' where id = 1;
