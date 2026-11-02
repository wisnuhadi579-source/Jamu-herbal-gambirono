-- ============================================================================
-- Migrasi 003: Gambirono Isolated Database
-- ============================================================================
-- Membuat tabel, sequence, indeks, RLS, dan RPC khusus Jamu Herbal Gambirono:
-- - public.gambirono_produk
-- - public.gambirono_transaksi_penjualan
-- - public.gambirono_stok_harian
-- - public.gambirono_mutasi_stok
-- - public.gambirono_jamu_meta
-- - public.gambirono_owner_attempts
--
-- Fungsi RPC: public.gambirono_jamu_storage(operation text, args jsonb)
--
-- Murni independen dan TIDAK memodifikasi maupun mengakses tabel Semboro.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Tabel Produk Gambirono
create table if not exists public.gambirono_produk (
  id text primary key,
  urutan integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  kode text unique not null,
  nama text not null,
  satuan text not null default 'ML',
  harga numeric(14,2) not null default 0 check (harga >= 0),
  aktif boolean not null default true
);

-- 2. Tabel Transaksi Penjualan Gambirono
create sequence if not exists public.gambirono_transaksi_penjualan_urutan_seq;

create table if not exists public.gambirono_transaksi_penjualan (
  id text primary key,
  urutan integer not null default nextval('public.gambirono_transaksi_penjualan_urutan_seq'),
  payload jsonb not null default '{}'::jsonb,
  nomor text unique not null,
  tanggal text not null,
  status text not null default 'Tercatat',
  total numeric(14,2) not null default 0 check (total >= 0),
  catatan text,
  created_at timestamptz not null default now()
);

alter table public.gambirono_transaksi_penjualan add column if not exists created_at timestamptz not null default now();
alter table public.gambirono_transaksi_penjualan alter column urutan set default nextval('public.gambirono_transaksi_penjualan_urutan_seq');

-- 3. Tabel Stok Harian Gambirono
create table if not exists public.gambirono_stok_harian (
  id text primary key,
  urutan integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  produk_id text not null references public.gambirono_produk(id) on delete cascade,
  tanggal text not null,
  jumlah integer not null default 0 check (jumlah >= 0),
  status text not null default 'Stok aman',
  constraint uq_gambirono_stok_harian_produk_tanggal unique (produk_id, tanggal)
);

-- 4. Tabel Mutasi Stok Gambirono
create table if not exists public.gambirono_mutasi_stok (
  id text primary key,
  urutan integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  produk_id text not null references public.gambirono_produk(id) on delete cascade,
  tanggal text not null,
  jumlah integer not null,
  jenis text not null default 'penyesuaian',
  catatan text
);

-- 5. Tabel Metadata & Revisi Gambirono
create table if not exists public.gambirono_jamu_meta (
  id integer primary key default 1 check (id = 1),
  revision integer not null default 1,
  settings jsonb not null default '{}'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  owner_user_id text,
  migration_version text not null default '003'
);

-- 6. Tabel Owner Rate-Limit Attempts Gambirono
create table if not exists public.gambirono_owner_attempts (
  bucket text primary key,
  attempts integer not null default 0,
  expires bigint not null
);

-- Indeks performa khusus Gambirono
create index if not exists idx_gambirono_produk_urutan on public.gambirono_produk(urutan);
create index if not exists idx_gambirono_transaksi_tanggal on public.gambirono_transaksi_penjualan(tanggal desc);
create index if not exists idx_gambirono_stok_harian_tanggal on public.gambirono_stok_harian(tanggal desc);
create index if not exists idx_gambirono_mutasi_stok_tanggal on public.gambirono_mutasi_stok(tanggal desc);

-- RLS: Kunci anon dan authenticated agar tabel hanya dapat diakses melalui server service_role
alter table public.gambirono_produk enable row level security;
alter table public.gambirono_transaksi_penjualan enable row level security;
alter table public.gambirono_stok_harian enable row level security;
alter table public.gambirono_mutasi_stok enable row level security;
alter table public.gambirono_jamu_meta enable row level security;
alter table public.gambirono_owner_attempts enable row level security;

-- ============================================================================
-- RPC: gambirono_jamu_storage
-- ============================================================================
create or replace function public.gambirono_jamu_storage(
  operation text,
  args jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
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
  v_bucket text;
  v_expires bigint;
  v_now bigint;
  v_attempts integer;
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
        'min_stock', coalesce((p.payload->>'min_stock')::numeric, 2),
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
          extra = coalesce(v_state->'extra', v_meta.extra)
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
          coalesce(v_item->>'satuan', v_item->>'unit', 'BOTOL'),
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
          insert into public.gambirono_transaksi_penjualan (id, urutan, nomor, tanggal, status, total, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            (v_item->>'urutan')::integer,
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
            payload = excluded.payload;
        else
          insert into public.gambirono_transaksi_penjualan (id, nomor, tanggal, status, total, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do update set
            nomor = excluded.nomor,
            tanggal = excluded.tanggal,
            status = excluded.status,
            total = excluded.total,
            catatan = excluded.catatan,
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
            coalesce((v_item->>'jumlah')::integer, (v_item->>'stock')::integer, 0),
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

    return jsonb_build_object('changes', 1);

  -- -------------------------------------------------------------------------
  -- OPERASI: insert -> [stateJsonStr, ownerCode] -> { changes: 1/0 }
  -- -------------------------------------------------------------------------
  elsif operation = 'insert' then
    v_state_str := args->>0;
    v_state := v_state_str::jsonb;

    insert into public.gambirono_jamu_meta (id, revision, settings, extra, migration_version)
    values (1, 1, coalesce(v_state->'settings', '{}'::jsonb), coalesce(v_state->'extra', '{}'::jsonb), '003')
    on conflict (id) do update set
      revision = 1,
      settings = excluded.settings,
      extra = excluded.extra,
      migration_version = '003';

    if v_state ? 'products' and jsonb_typeof(v_state->'products') = 'array' then
      for v_item in select value from jsonb_array_elements(v_state->'products') loop
        insert into public.gambirono_produk (id, urutan, kode, nama, satuan, harga, aktif, payload)
        values (
          coalesce(v_item->>'id', gen_random_uuid()::text),
          coalesce((v_item->>'urutan')::integer, 0),
          coalesce(v_item->>'kode', v_item->>'code', v_item->>'sku', 'JH'),
          coalesce(v_item->>'nama', v_item->>'name', 'Produk'),
          coalesce(v_item->>'satuan', v_item->>'unit', 'BOTOL'),
          coalesce((v_item->>'harga')::numeric, (v_item->>'price')::numeric, (v_item->>'sell_price')::numeric, 0),
          coalesce((v_item->>'aktif')::boolean, (v_item->>'active')::boolean, true),
          coalesce(v_item->'payload', v_item)
        )
        on conflict (id) do nothing;
      end loop;
    end if;

    if v_state ? 'transactions' or v_state ? 'sales' then
      for v_item in select value from jsonb_array_elements(coalesce(v_state->'transactions', v_state->'sales')) loop
        if (v_item->>'urutan')::integer > 0 then
          insert into public.gambirono_transaksi_penjualan (id, urutan, nomor, tanggal, status, total, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            (v_item->>'urutan')::integer,
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do nothing;
        else
          insert into public.gambirono_transaksi_penjualan (id, nomor, tanggal, status, total, catatan, payload)
          values (
            coalesce(v_item->>'id', gen_random_uuid()::text),
            coalesce(v_item->>'nomor', v_item->>'invoice_no', 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
            coalesce(v_item->>'tanggal', v_item->>'date', now()::text),
            coalesce(v_item->>'status', 'Tercatat'),
            coalesce((v_item->>'total')::numeric, 0),
            nullif(trim(coalesce(v_item->>'catatan', v_item->>'notes', v_item->>'customer_name', '')), ''),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (id) do nothing;
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
            coalesce((v_item->>'jumlah')::integer, (v_item->>'stock')::integer, 0),
            coalesce(v_item->>'status', 'Stok aman'),
            coalesce(v_item->'payload', v_item)
          )
          on conflict (produk_id, tanggal) do nothing;
        end if;
      end loop;
    end if;

    return jsonb_build_object('changes', 1);

  -- -------------------------------------------------------------------------
  -- OPERASI: attempt -> [bucket, expiresEpochMs] -> { attempts: number }
  -- -------------------------------------------------------------------------
  elsif operation = 'attempt' then
    v_bucket := args->>0;
    v_expires := (args->>1)::bigint;

    insert into public.gambirono_owner_attempts (bucket, attempts, expires)
    values (v_bucket, 1, v_expires)
    on conflict (bucket) do update set
      attempts = case
        when public.gambirono_owner_attempts.expires < (extract(epoch from now()) * 1000)::bigint then 1
        else public.gambirono_owner_attempts.attempts + 1
      end,
      expires = excluded.expires
    returning attempts into v_attempts;

    return jsonb_build_object('attempts', v_attempts);

  -- -------------------------------------------------------------------------
  -- OPERASI: cleanup -> [bucket, nowEpochMs] -> { changes: number }
  -- -------------------------------------------------------------------------
  elsif operation = 'cleanup' then
    v_bucket := args->>0;
    v_now := (args->>1)::bigint;

    delete from public.gambirono_owner_attempts
    where bucket = v_bucket or expires < v_now;

    return jsonb_build_object('changes', 1);

  else
    raise exception 'Operasi RPC tidak dikenal: %', operation;
  end if;
end;
$$;
