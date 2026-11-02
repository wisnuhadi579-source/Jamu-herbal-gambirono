-- ============================================================================
-- Migrasi 010: Gambirono Aggregate Stock History
-- ============================================================================
-- Membuat tabel ringkasan perubahan stok keseluruhan toko (14 produk jamu).
-- ============================================================================

-- 1. Tabel Riwayat Stok Keseluruhan
create table if not exists public.gambirono_riwayat_stok (
  id text primary key,
  tanggal text not null,
  waktu_update timestamptz not null default now(),
  total_stok_sebelumnya numeric not null default 0,
  total_stok_terbaru numeric not null default 0,
  perubahan_stok numeric not null default 0,
  jenis_perubahan text not null,
  keterangan text,
  batch_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gambirono_riwayat_stok_tanggal on public.gambirono_riwayat_stok(tanggal desc);
create index if not exists idx_gambirono_riwayat_stok_waktu on public.gambirono_riwayat_stok(waktu_update desc);

-- 2. DYNAMIC BACKFILL: Rekonstruksi Riwayat Total Stok
-- Menghitung total stok per tanggal dari gambirono_stok_harian
insert into public.gambirono_riwayat_stok (id, tanggal, waktu_update, total_stok_sebelumnya, total_stok_terbaru, perubahan_stok, jenis_perubahan, keterangan)
with daily_totals as (
  select 
    tanggal,
    sum(jumlah) as total_qty,
    min(id) as first_id -- dummy for ordering
  from public.gambirono_stok_harian
  group by tanggal
  order by tanggal
),
daily_diffs as (
  select 
    tanggal,
    total_qty,
    lag(total_qty, 1, 0) over (order by tanggal) as prev_total
  from daily_totals
)
select 
  'hist-' || tanggal as id,
  tanggal,
  (tanggal || 'T12:00:00Z')::timestamptz as waktu_update,
  prev_total as total_stok_sebelumnya,
  total_qty as total_stok_terbaru,
  (prev_total - total_qty) as perubahan_stok,
  case 
    when (prev_total - total_qty) > 0 then 'Stok berkurang'
    when (prev_total - total_qty) < 0 then 'Stok bertambah'
    else 'Tidak berubah'
  end as jenis_perubahan,
  'Data historis hasil rekonstruksi' as keterangan
from daily_diffs
on conflict (id) do nothing;

-- 3. UPDATE RPC: Mendukung Riwayat Stok Agregat
create or replace function public.gambirono_jamu_storage(
  operation text,
  args jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_meta record;
  v_products jsonb;
  v_sales jsonb;
  v_stocks jsonb;
  v_mutations jsonb;
  v_riwayat jsonb;
  v_state jsonb;
  v_state_str text;
  v_expected_rev integer;
  v_item jsonb;
begin
  if operation = 'read' then
    select * into v_meta from public.gambirono_jamu_meta where id = 1;
    if not found then
      return null;
    end if;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id, 'urutan', p.urutan, 'kode', p.kode, 'nama', p.nama,
        'satuan', p.satuan, 'harga', p.harga, 'aktif', p.aktif, 'payload', p.payload
      ) order by p.urutan, p.kode
    ), '[]'::jsonb) into v_products from public.gambirono_produk p where p.aktif = true;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', t.id, 'nomor', t.nomor, 'tanggal', t.tanggal, 'status', t.status, 'total', t.total,
        'catatan', t.catatan, 'jamu_terjual_ml', t.jamu_terjual_ml, 'restok_ml', t.restok_ml, 'payload', t.payload
      ) order by t.tanggal desc, t.created_at desc
    ), '[]'::jsonb) into v_sales from public.gambirono_transaksi_penjualan t;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', s.id, 'produk_id', s.produk_id, 'tanggal', s.tanggal, 'jumlah', s.jumlah, 'status', s.status, 'payload', s.payload
      ) order by s.tanggal desc, s.urutan
    ), '[]'::jsonb) into v_stocks from public.gambirono_stok_harian s;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', m.id, 'produk_id', m.produk_id, 'tanggal', m.tanggal, 'created_at', m.created_at,
        'stok_sebelumnya', m.stok_sebelumnya, 'stok_terbaru', m.stok_terbaru, 'perubahan', m.perubahan,
        'jumlah', m.jumlah, 'jenis', m.jenis, 'catatan', m.catatan, 'payload', m.payload
      ) order by m.created_at desc
    ), '[]'::jsonb) into v_mutations from public.gambirono_mutasi_stok m;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', r.id, 'tanggal', r.tanggal, 'waktu_update', r.waktu_update,
        'total_stok_sebelumnya', r.total_stok_sebelumnya, 'total_stok_terbaru', r.total_stok_terbaru,
        'perubahan_stok', r.perubahan_stok, 'jenis_perubahan', r.jenis_perubahan,
        'keterangan', r.keterangan, 'batch_id', r.batch_id
      ) order by r.waktu_update desc
    ), '[]'::jsonb) into v_riwayat from public.gambirono_riwayat_stok r;

    v_state := jsonb_build_object(
      'schemaVersion', 1,
      'products', v_products,
      'sales', v_sales,
      'dailyStocks', v_stocks,
      'stockMutations', v_mutations,
      'aggregateStockHistory', v_riwayat,
      'settings', v_meta.settings,
      'extra', v_meta.extra
    );

    return jsonb_build_object(
      'revision', v_meta.revision,
      'data', v_state::text
    );

  elsif operation = 'update' then
    v_state_str := args->>0;
    v_expected_rev := (args->>2)::integer;

    select * into v_meta from public.gambirono_jamu_meta where id = 1 for update;
    if not found or v_meta.revision <> v_expected_rev then
      return jsonb_build_object('changes', 0);
    end if;

    v_state := v_state_str::jsonb;

    update public.gambirono_jamu_meta
      set revision = v_meta.revision + 1,
          settings = coalesce(v_state->'settings', v_meta.settings),
          extra = coalesce(v_state->'extra', v_meta.extra),
          migration_version = '010'
      where id = 1;

    -- Upsert Produk
    if v_state ? 'products' then
      for v_item in select value from jsonb_array_elements(v_state->'products') loop
        insert into public.gambirono_produk (id, urutan, kode, nama, satuan, harga, aktif, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          v_item->>'kode', v_item->>'nama', v_item->>'satuan',
          coalesce((v_item->>'harga')::numeric, 0),
          coalesce((v_item->>'aktif')::boolean, true),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do update set
          urutan = excluded.urutan, kode = excluded.kode, nama = excluded.nama,
          satuan = excluded.satuan, harga = excluded.harga, aktif = excluded.aktif, payload = excluded.payload;
      end loop;
    end if;

    -- Upsert Transaksi
    if v_state ? 'sales' then
      for v_item in select value from jsonb_array_elements(v_state->'sales') loop
        insert into public.gambirono_transaksi_penjualan (id, nomor, tanggal, status, total, catatan, jamu_terjual_ml, restok_ml, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          v_item->>'nomor', v_item->>'tanggal', coalesce(v_item->>'status', 'Tercatat'),
          coalesce((v_item->>'total')::numeric, 0), v_item->>'catatan',
          coalesce((v_item->>'jamu_terjual_ml')::numeric, 0), coalesce((v_item->>'restok_ml')::numeric, 0),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do update set
          nomor = excluded.nomor, tanggal = excluded.tanggal, status = excluded.status,
          total = excluded.total, catatan = excluded.catatan, jamu_terjual_ml = excluded.jamu_terjual_ml,
          restok_ml = excluded.restok_ml, payload = excluded.payload;
      end loop;
    end if;

    -- Upsert Stok Harian
    if v_state ? 'dailyStocks' then
      for v_item in select value from jsonb_array_elements(v_state->'dailyStocks') loop
        insert into public.gambirono_stok_harian (id, urutan, produk_id, tanggal, jumlah, status, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          v_item->>'produk_id', v_item->>'tanggal',
          coalesce((v_item->>'jumlah')::numeric, 0),
          coalesce(v_item->>'status', 'Stok aman'),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (produk_id, tanggal) do update set
          urutan = excluded.urutan, jumlah = excluded.jumlah, status = excluded.status, payload = excluded.payload;
      end loop;
    end if;

    -- Upsert Mutasi Stok
    if v_state ? 'stockMutations' then
      for v_item in select value from jsonb_array_elements(v_state->'stockMutations') loop
        insert into public.gambirono_mutasi_stok (id, urutan, produk_id, tanggal, created_at, stok_sebelumnya, stok_terbaru, perubahan, jumlah, jenis, catatan, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          v_item->>'produk_id', v_item->>'tanggal',
          coalesce((v_item->>'created_at')::timestamptz, now()),
          coalesce((v_item->>'stok_sebelumnya')::numeric, 0),
          coalesce((v_item->>'stok_terbaru')::numeric, 0),
          coalesce((v_item->>'perubahan')::numeric, 0),
          coalesce((v_item->>'jumlah')::numeric, 0),
          v_item->>'jenis', v_item->>'catatan',
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do update set
          stok_sebelumnya = excluded.stok_sebelumnya, stok_terbaru = excluded.stok_terbaru,
          perubahan = excluded.perubahan, jumlah = excluded.jumlah, jenis = excluded.jenis, catatan = excluded.catatan;
      end loop;
    end if;

    -- Upsert Riwayat Stok Agregat
    if v_state ? 'aggregateStockHistory' then
      for v_item in select value from jsonb_array_elements(v_state->'aggregateStockHistory') loop
        insert into public.gambirono_riwayat_stok (id, tanggal, waktu_update, total_stok_sebelumnya, total_stok_terbaru, perubahan_stok, jenis_perubahan, keterangan, batch_id)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          v_item->>'tanggal',
          coalesce((v_item->>'waktu_update')::timestamptz, now()),
          coalesce((v_item->>'total_stok_sebelumnya')::numeric, 0),
          coalesce((v_item->>'total_stok_terbaru')::numeric, 0),
          coalesce((v_item->>'perubahan_stok')::numeric, 0),
          v_item->>'jenis_perubahan',
          v_item->>'keterangan',
          v_item->>'batch_id'
        )
        on conflict (id) do update set
          total_stok_sebelumnya = excluded.total_stok_sebelumnya,
          total_stok_terbaru = excluded.total_stok_terbaru,
          perubahan_stok = excluded.perubahan_stok,
          jenis_perubahan = excluded.jenis_perubahan,
          keterangan = excluded.keterangan;
      end loop;
    end if;

    return jsonb_build_object('changes', 1);

  elsif operation = 'insert' then
    v_state_str := args->>0;
    v_state := v_state_str::jsonb;
    insert into public.gambirono_jamu_meta (id, revision, settings, extra, migration_version)
    values (1, 1, coalesce(v_state->'settings', '{}'::jsonb), coalesce(v_state->'extra', '{}'::jsonb), '010')
    on conflict (id) do update set revision = 1, settings = excluded.settings, extra = excluded.extra, migration_version = '010';
    return jsonb_build_object('changes', 1);
  end if;

  return jsonb_build_object('error', 'Operasi tidak dikenal');
end;
$$;

-- 4. Update metadata versi migrasi
update public.gambirono_jamu_meta set migration_version = '010' where id = 1;
