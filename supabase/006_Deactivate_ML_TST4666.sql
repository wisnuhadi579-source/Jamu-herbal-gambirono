-- ============================================================================
-- Migrasi 006: Nonaktifkan Produk ML dan TST_4666 pada Database Gambirono
-- ============================================================================
-- Mengubah status aktif menjadi false untuk produk ML (Madu Lanang) dan TST_4666
-- tanpa menghapus data historis pada gambirono_produk, transaksi, maupun mutasi.
-- ============================================================================

update public.gambirono_produk
  set aktif = false,
      payload = jsonb_set(
        jsonb_set(coalesce(payload, '{}'::jsonb), '{aktif}', 'false'::jsonb),
        '{active}', 'false'::jsonb
      )
  where upper(trim(kode)) in ('ML', 'MADU LANANG', 'TST_4666')
     or upper(trim(nama)) in ('MADU LANANG', 'ML', 'TST_4666')
     or id in ('prod-15', 'bd9a7a65-bcc0-5ae9-ba2d-2790cc7ab274');

update public.gambirono_jamu_meta
  set migration_version = '006'
  where id = 1;
