-- ============================================================================
-- Migrasi 011: Perbaikan Rumus Tanda Perubahan Stok
-- ============================================================================
-- Mengubah rumus dari (sebelumnya - terbaru) menjadi (terbaru - sebelumnya).
-- Menyesuaikan tanda (+) dan (-) serta label jenis_perubahan.
-- ============================================================================

-- 1. Update data yang sudah ada di tabel riwayat stok
UPDATE public.gambirono_riwayat_stok
SET 
  perubahan_stok = total_stok_terbaru - total_stok_sebelumnya,
  jenis_perubahan = CASE 
    WHEN (total_stok_terbaru - total_stok_sebelumnya) > 0 THEN 'Stok bertambah'
    WHEN (total_stok_terbaru - total_stok_sebelumnya) < 0 THEN 'Stok berkurang'
    ELSE 'Tidak berubah'
  END;

-- 2. Update metadata versi migrasi
UPDATE public.gambirono_jamu_meta SET migration_version = '011' WHERE id = 1;
