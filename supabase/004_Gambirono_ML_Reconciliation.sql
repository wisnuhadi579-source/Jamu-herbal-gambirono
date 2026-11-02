-- ============================================================================
-- Migrasi 004: Gambirono ML & Reconciliation
-- ============================================================================
-- Menambahkan dukungan volume mililiter (ml) dan rekonsiliasi stok:
-- 1. Tambah kolom jamu_terjual_ml dan restok_ml di gambirono_transaksi_penjualan
-- 2. Mengubah tipe kolom jumlah di gambirono_stok_harian menjadi numeric (ml)
-- 3. Mengubah default satuan produk menjadi 'ML'
-- 4. Memperbarui RPC public.gambirono_jamu_storage()
-- ============================================================================

-- 1. Tambah Kolom ML pada Transaksi Penjualan Gambirono
alter table public.gambirono_transaksi_penjualan
  add column if not exists jamu_terjual_ml numeric not null default 0 check (jamu_terjual_ml >= 0);

alter table public.gambirono_transaksi_penjualan
  add column if not exists restok_ml numeric not null default 0 check (restok_ml >= 0);

-- 2. Ubah Tipe Kolom Jumlah Stok Harian Gambirono menjadi Numeric
alter table public.gambirono_stok_harian
  alter column jumlah type numeric using jumlah::numeric;

-- 3. Ubah Default Satuan Produk Gambirono
alter table public.gambirono_produk
  alter column satuan set default 'ML';

-- 4. Perbarui Versi Migrasi Metadata
update public.gambirono_jamu_meta
  set migration_version = '004'
  where id = 1;

-- ============================================================================
-- RPC: public.gambirono_jamu_storage (Versi 004 dengan Dukungan ML & Restok)
-- ============================================================================
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
  v_state jsonb;
  v_state_str text;
  v_expected_rev integer;
  v_item jsonb;
begin
  -- -------------------------------------------------------------------------
  -- OPERASI: read -> null atau { revision, owner_user_id, data: string JSON }
  -- -------------------------------------------------------------------------
  if operation = 'read' then
    select * into v_meta from public.gambirono_jamu_meta where id = 1;
    if not found then
      return null;
    end if;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'urutan', p.urutan,
        'code', p.kode,
        'kode', p.kode,
        'sku', p.kode,
        'name', p.nama,
        'nama', p.nama,
        'unit', p.satuan,
        'satuan', p.satuan,
        'price', p.harga,
        'harga', p.harga,
        'sell_price', p.harga,
        'buy_price', coalesce((p.payload->>'buy_price')::numeric, 0),
        'stock', coalesce((p.payload->>'stock')::numeric, 0),
        'min_stock', coalesce((p.payload->>'min_stock')::numeric, 200),
        'active', p.aktif,
        'aktif', p.aktif,
        'payload', p.payload
      ) order by p.urutan, p.kode
    ), '[]'::jsonb) into v_products from public.gambirono_produk p where p.aktif = true;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'urutan', t.urutan,
        'invoice_no', t.nomor,
        'nomor', t.nomor,
        'date', t.tanggal,
        'tanggal', t.tanggal,
        'created_at', coalesce(t.created_at, (t.payload->>'created_at')::timestamptz, (t.tanggal || 'T12:00:00Z')::timestamptz, now()),
        'status', t.status,
        'total', t.total,
        'notes', t.catatan,
        'catatan', t.catatan,
        'customer_name', coalesce(t.payload->>'customer_name', t.catatan),
        'payment_method', coalesce(t.payload->>'payment_method', 'Tunai'),
        'jamu_terjual_ml', coalesce(t.jamu_terjual_ml, (t.payload->>'jamu_terjual_ml')::numeric, 0),
        'restok_ml', coalesce(t.restok_ml, (t.payload->>'restok_ml')::numeric, 0),
        'items', coalesce(t.payload->'items', '[]'::jsonb),
        'payload', t.payload
      ) order by t.tanggal desc, t.created_at desc
    ), '[]'::jsonb) into v_sales from public.gambirono_transaksi_penjualan t;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'urutan', s.urutan,
        'produk_id', s.produk_id,
        'tanggal', s.tanggal,
        'jumlah', s.jumlah,
        'status', s.status,
        'payload', s.payload
      ) order by s.tanggal desc, s.urutan
    ), '[]'::jsonb) into v_stocks from public.gambirono_stok_harian s;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'urutan', m.urutan,
        'produk_id', m.produk_id,
        'tanggal', m.tanggal,
        'jumlah', m.jumlah,
        'jenis', m.jenis,
        'catatan', m.catatan,
        'payload', m.payload
      ) order by m.tanggal desc, m.urutan
    ), '[]'::jsonb) into v_mutations from public.gambirono_mutasi_stok m;

    v_state := jsonb_build_object(
      'schemaVersion', 1,
      'products', v_products,
      'sales', v_sales,
      'transactions', v_sales,
      'dailyStocks', v_stocks,
      'stok_harian', v_stocks,
      'stockMutations', v_mutations,
      'mutasi_stok', v_mutations,
      'settings', v_meta.settings,
      'extra', v_meta.extra
    );

    return jsonb_build_object(
      'revision', v_meta.revision,
      'owner_user_id', v_meta.owner_user_id,
      'data', v_state::text
    );

  -- -------------------------------------------------------------------------
  -- OPERASI: update -> [nextStateJsonStr, ownerCode, expectedRevision] -> { changes: 1/0 }
  -- -------------------------------------------------------------------------
  elsif operation = 'update' then
    v_state_str := args->>0;
    v_expected_rev := (args->>2)::integer;

    select * into v_meta from public.gambirono_jamu_meta where id = 1 for update;
    if not found or v_meta.revision <> v_expected_rev then
      return jsonb_build_object('changes', 0);
    end if;

    v_state := v_state_str::jsonb;

    -- Update metadata
    update public.gambirono_jamu_meta
      set revision = v_meta.revision + 1,
          settings = coalesce(v_state->'settings', v_meta.settings),
          extra = coalesce(v_state->'extra', v_meta.extra),
          migration_version = '004'
      where id = 1;

    -- Sinkronisasi tabel gambirono_produk
    if v_state ? 'products' and jsonb_typeof(v_state->'products') = 'array' then
      for v_item in select value from jsonb_array_elements(v_state->'products') loop
        insert into public.gambirono_produk (id, urutan, kode, nama, satuan, harga, aktif, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          coalesce(v_item->>'kode', v_item->>'code', v_item->>'sku', 'JH'),
          coalesce(v_item->>'nama', v_item->>'name', 'Produk'),
          coalesce(v_item->>'satuan', v_item->>'unit', 'ML'),
          coalesce((v_item->>'harga')::numeric, (v_item->>'price')::numeric, (v_item->>'sell_price')::numeric, 0),
          coalesce((v_item->>'aktif')::boolean, (v_item->>'active')::boolean, true),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do update set
          urutan = excluded.urutan,
          kode = excluded.kode,
          nama = excluded.nama,
          satuan = excluded.satuan,
          harga = excluded.harga,
          aktif = excluded.aktif,
          payload = excluded.payload;
      end loop;
    end if;

    -- Sinkronisasi transaksi penjualan gambirono
    if v_state ? 'transactions' or v_state ? 'sales' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'transactions', v_state->'sales')) loop
        if (v_item->>'urutan')::integer > 0 then
          insert into public.gambirono_transaksi_penjualan (id, urutan, nomor, tanggal, status, total, catatan, jamu_terjual_ml, restok_ml, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            (v_item->>'urutan')::integer,
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce((v_item->>'jamu_terjual_ml')::numeric, 0),
            coalesce((v_item->>'restok_ml')::numeric, 0),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
            jamu_terjual_ml = excluded.jamu_terjual_ml,
            restok_ml = excluded.restok_ml,
            payload = excluded.payload;
        else
          insert into public.gambirono_transaksi_penjualan (id, nomor, tanggal, status, total, catatan, jamu_terjual_ml, restok_ml, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce((v_item->>'jamu_terjual_ml')::numeric, 0),
            coalesce((v_item->>'restok_ml')::numeric, 0),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
            jamu_terjual_ml = excluded.jamu_terjual_ml,
            restok_ml = excluded.restok_ml,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    -- Sinkronisasi stok harian gambirono
    if v_state ? 'dailyStocks' or v_state ? 'stok_harian' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'dailyStocks', v_state->'stok_harian')) loop
        if v_item->>'produk_id' is not null and v_item->>'tanggal' is not null then
          insert into public.gambirono_stok_harian (id, urutan, produk_id, tanggal, jumlah, status, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce((v_item->>'urutan')::integer, 0),
            v_item->>'produk_id',
            v_item->>'tanggal',
            coalesce((v_item->>'jumlah')::numeric, (v_item->>'stock')::numeric, 0),
            coalesce(v_item->>'status', 'Stok aman'),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (produk_id, tanggal) do update set
            urutan = excluded.urutan,
            jumlah = excluded.jumlah,
            status = excluded.status,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    -- Sinkronisasi mutasi stok gambirono
    if v_state ? 'stockMutations' or v_state ? 'mutasi_stok' or v_state ? 'moves' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'stockMutations', v_state->'mutasi_stok', v_state->'moves')) loop
        if coalesce(v_item->>'produk_id', v_item->>'productId') is not null then
          insert into public.gambirono_mutasi_stok (id, urutan, produk_id, tanggal, jumlah, jenis, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce((v_item->>'urutan')::integer, 0),
            coalesce(v_item->>'produk_id', v_item->>'productId'),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce((v_item->>'jumlah')::numeric, (v_item->>'qty')::numeric, 0),
            coalesce(v_item->>'jenis', 'penyesuaian'),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            urutan = excluded.urutan,
            jumlah = excluded.jumlah,
            jenis = excluded.jenis,
            catatan = excluded.catatan,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    return jsonb_build_object('changes', 1);

  -- -------------------------------------------------------------------------
  -- OPERASI: insert -> [stateJsonStr] -> { changes: 1/0 }
  -- -------------------------------------------------------------------------
  elsif operation = 'insert' then
    v_state_str := args->>0;
    v_state := v_state_str::jsonb;

    insert into public.gambirono_jamu_meta (id, revision, settings, extra, migration_version)
    values (1, 1, coalesce(v_state->'settings', '{}'::jsonb), coalesce(v_state->'extra', '{}'::jsonb), '004')
    on conflict (id) do update set
      revision = 1,
      settings = excluded.settings,
      extra = excluded.extra,
      migration_version = '004';

    if v_state ? 'products' and jsonb_typeof(v_state->'products') = 'array' then
      for v_item in select value from jsonb_array_elements(v_state->'products') loop
        insert into public.gambirono_produk (id, urutan, kode, nama, satuan, harga, aktif, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          coalesce(v_item->>'kode', v_item->>'code', v_item->>'sku', 'JH'),
          coalesce(v_item->>'nama', v_item->>'name', 'Produk'),
          coalesce(v_item->>'satuan', v_item->>'unit', 'ML'),
          coalesce((v_item->>'harga')::numeric, (v_item->>'price')::numeric, (v_item->>'sell_price')::numeric, 0),
          coalesce((v_item->>'aktif')::boolean, (v_item->>'active')::boolean, true),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do update set
          urutan = excluded.urutan,
          kode = excluded.kode,
          nama = excluded.nama,
          satuan = excluded.satuan,
          harga = excluded.harga,
          aktif = excluded.aktif,
          payload = excluded.payload;
      end loop;
    end if;

    if v_state ? 'transactions' or v_state ? 'sales' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'transactions', v_state->'sales')) loop
        if (v_item->>'urutan')::integer > 0 then
          insert into public.gambirono_transaksi_penjualan (id, urutan, nomor, tanggal, status, total, catatan, jamu_terjual_ml, restok_ml, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            (v_item->>'urutan')::integer,
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce((v_item->>'jamu_terjual_ml')::numeric, 0),
            coalesce((v_item->>'restok_ml')::numeric, 0),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
            jamu_terjual_ml = excluded.jamu_terjual_ml,
            restok_ml = excluded.restok_ml,
            payload = excluded.payload;
        else
          insert into public.gambirono_transaksi_penjualan (id, nomor, tanggal, status, total, catatan, jamu_terjual_ml, restok_ml, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce((v_item->>'jamu_terjual_ml')::numeric, 0),
            coalesce((v_item->>'restok_ml')::numeric, 0),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
            jamu_terjual_ml = excluded.jamu_terjual_ml,
            restok_ml = excluded.restok_ml,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    if v_state ? 'dailyStocks' or v_state ? 'stok_harian' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'dailyStocks', v_state->'stok_harian')) loop
        if v_item->>'produk_id' is not null and v_item->>'tanggal' is not null then
          insert into public.gambirono_stok_harian (id, urutan, produk_id, tanggal, jumlah, status, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce((v_item->>'urutan')::integer, 0),
            v_item->>'produk_id',
            v_item->>'tanggal',
            coalesce((v_item->>'jumlah')::numeric, (v_item->>'stock')::numeric, 0),
            coalesce(v_item->>'status', 'Stok aman'),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (produk_id, tanggal) do update set
            urutan = excluded.urutan,
            jumlah = excluded.jumlah,
            status = excluded.status,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    if v_state ? 'stockMutations' or v_state ? 'mutasi_stok' or v_state ? 'moves' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'stockMutations', v_state->'mutasi_stok', v_state->'moves')) loop
        if coalesce(v_item->>'produk_id', v_item->>'productId') is not null then
          insert into public.gambirono_mutasi_stok (id, urutan, produk_id, tanggal, jumlah, jenis, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce((v_item->>'urutan')::integer, 0),
            coalesce(v_item->>'produk_id', v_item->>'productId'),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce((v_item->>'jumlah')::numeric, (v_item->>'qty')::numeric, 0),
            coalesce(v_item->>'jenis', 'penyesuaian'),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            urutan = excluded.urutan,
            jumlah = excluded.jumlah,
            jenis = excluded.jenis,
            catatan = excluded.catatan,
            payload = excluded.payload;
        end if;
      end loop;
    end if;

    return jsonb_build_object('changes', 1);

  end if;

  return jsonb_build_object('error', 'Operasi tidak dikenal');
end;
$$;

grant execute on function public.gambirono_jamu_storage(text, jsonb) to authenticated, anon, service_role;
