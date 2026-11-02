// ============================================================================
// server/supabase-db.js - Supabase REST RPC Adapter for gambirono_jamu_storage
// ============================================================================

import { initialSchema1State } from './core.js';

let localMemoryState = JSON.parse(JSON.stringify(initialSchema1State));
let localRevision = 1;

/**
 * Dapatkan konfigurasi Supabase dari environment (Tanpa hardcoded key)
 */
export function getSupabaseConfig(env = {}) {
  const urlVal = env && env.SUPABASE_URL !== undefined ? env.SUPABASE_URL : (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '');
  const keyVal = env && env.SUPABASE_SERVICE_ROLE_KEY !== undefined ? env.SUPABASE_SERVICE_ROLE_KEY : (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY : '');
  const url = (urlVal || '').trim().replace(/\/$/, '');
  const key = (keyVal || '').trim();
  const configured = Boolean(url && key);
  return { url, key, configured };
}

/**
 * Panggil REST RPC gambirono_jamu_storage pada Supabase
 * Endpoint: ${SUPABASE_URL}/rest/v1/rpc/gambirono_jamu_storage
 */
export async function callJamuStorage(operation, args = [], env = {}) {
  const { url, key, configured } = getSupabaseConfig(env);

  // Jika Supabase belum dikonfigurasi di server
  if (!configured) {
    if (typeof process !== 'undefined' && process.env?.TEST_MOCK === 'true') {
      return handleLocalFallback(operation, args);
    }
    const err = new Error('Konfigurasi database server belum lengkap. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur di Cloudflare Functions.');
    err.status = 503;
    throw err;
  }

  const endpoint = `${url}/rest/v1/rpc/gambirono_jamu_storage`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operation, args })
  });

  if (res.ok) {
    const data = await res.json();
    return data;
  }

  const errText = await res.text();

  // Jika terjadi safeupdate error dari RPC di PostgreSQL
  // if (operation === 'update' && errText.includes('DELETE requires a WHERE clause')) {
  //   return await handleDirectTableUpdate(url, headers, args);
  // }

  // Jika RPC belum ada di Supabase
  if (res.status === 404 || errText.includes('could not find the function') || errText.includes('PGRST202')) {
    const err = new Error('Fungsi RPC gambirono_jamu_storage belum dibuat di Supabase. Jalankan seluruh file SQL di folder supabase (003 sampai 008) di SQL Editor.');
    err.status = 500;
    throw err;
  }

  // Jika kolom tabel belum lengkap (Error 42703)
  if (errText.includes('42703') || errText.includes('column') && errText.includes('does not exist')) {
    const err = new Error('Struktur database belum lengkap. Jalankan file SQL 009_Gambirono_Add_Sales_Volume_Columns.sql di SQL Editor Supabase untuk menambahkan kolom volume jamu.');
    err.status = 400;
    throw err;
  }

  const err = new Error(`Supabase Database Error (${res.status}): ${errText}`);
  err.status = res.status || 500;
  throw err;
}

/**
 * Pembaruan langsung ke tabel gambirono terpisah jika RPC database terbentur safeupdate strict mode
 */
async function handleDirectTableUpdate(url, headers, args) {
  const nextStateStr = args[0];
  const expectedRev = Number(args[2]);
  const nextState = typeof nextStateStr === 'string' ? JSON.parse(nextStateStr) : nextStateStr;

  // 1. Periksa revisi di gambirono_jamu_meta
  const metaRes = await fetch(`${url}/rest/v1/gambirono_jamu_meta?id=eq.1`, { headers });
  if (!metaRes.ok) {
    const err = new Error(`Gagal membaca metadata Supabase (HTTP ${metaRes.status})`);
    err.status = metaRes.status;
    throw err;
  }
  const metaRows = await metaRes.json();
  const currentMeta = metaRows[0];
  if (!currentMeta || Number(currentMeta.revision) !== expectedRev) {
    return { changes: 0 }; // Konflik revisi
  }

  const newRevision = expectedRev + 1;

  // 2. Update gambirono_jamu_meta
  const metaPatchRes = await fetch(`${url}/rest/v1/gambirono_jamu_meta?id=eq.1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      revision: newRevision,
      settings: nextState.settings || currentMeta.settings,
      extra: nextState.extra || currentMeta.extra
    })
  });
  if (!metaPatchRes.ok) {
    throw new Error(`Gagal memperbarui metadata Supabase (HTTP ${metaPatchRes.status})`);
  }

  // 3. Masukkan transaksi baru ke public.gambirono_transaksi_penjualan
  const sales = nextState.sales || nextState.transactions || [];
  if (sales.length > 0) {
    for (const trx of sales) {
      if (!trx || !trx.id) continue;
      const bodyObj = {
        id: trx.id,
        nomor: trx.number || trx.nomor || trx.invoice_no || `TRX-${Date.now()}`,
        tanggal: (trx.date || trx.tanggal || new Date().toISOString()).slice(0, 10),
        status: trx.status === 'Tercatat' ? 'valid' : (trx.status || 'valid'),
        total: Number(trx.total) || 0,
        catatan: trx.note || trx.catatan || '',
        jamu_terjual_ml: Math.max(0, Number(trx.jamu_terjual_ml || (trx.payload && trx.payload.jamu_terjual_ml) || 0)),
        restok_ml: Math.max(0, Number(trx.restok_ml || (trx.payload && trx.payload.restok_ml) || 0)),
        payload: trx.payload || trx
      };
      if (trx.urutan && Number(trx.urutan) > 0) {
        bodyObj.urutan = Number(trx.urutan);
      }

      const trxRes = await fetch(`${url}/rest/v1/gambirono_transaksi_penjualan`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(bodyObj)
      });
      if (!trxRes.ok) {
        throw new Error(`Gagal menyimpan transaksi ke gambirono_transaksi_penjualan (HTTP ${trxRes.status})`);
      }
    }
  }

  // 4. Masukkan stok baru ke public.gambirono_stok_harian
  const stockEntries = nextState.dailyStocks || nextState.stockEntries || nextState.stok_harian || [];
  if (stockEntries.length > 0) {
    for (const s of stockEntries) {
      const prodId = s.productId || s.produk_id;
      const date = s.date || s.tanggal;
      const qty = Number(s.jumlah !== undefined ? s.jumlah : (s.qty !== undefined ? s.qty : s.stock)) || 0;
      const statusEnum = qty > 200 ? 'safe' : 'low';
      if (prodId && date) {
        const stockRes = await fetch(`${url}/rest/v1/gambirono_stok_harian?on_conflict=produk_id,tanggal`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id: s.id || `stock-${Date.now()}-${prodId}`,
            urutan: Number(s.urutan) || 1,
            produk_id: prodId,
            tanggal: date,
            jumlah: qty,
            status: statusEnum,
            payload: s.payload || { stock: qty, status: statusEnum }
          })
        });
        if (!stockRes.ok) {
          throw new Error(`Gagal menyimpan stok ke gambirono_stok_harian (HTTP ${stockRes.status})`);
        }
      }
    }
  }

  // 5. Perbarui payload stok pada public.gambirono_produk
  const products = nextState.products || [];
  for (const p of products) {
    if (p.id) {
      await fetch(`${url}/rest/v1/gambirono_produk?id=eq.${p.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          payload: {
            ...(p.payload || {}),
            stock: Number(p.stock !== undefined ? p.stock : 0)
          }
        })
      });
    }
  }

  // 6. Masukkan mutasi stok ke public.gambirono_mutasi_stok
  const moves = nextState.stockMutations || nextState.mutasi_stok || nextState.moves || [];
  if (moves.length > 0) {
    for (const m of moves) {
      if (!m || !m.id) continue;
      const prodId = m.produk_id || m.productId;
      if (!prodId) continue;

      const mutObj = {
        id: m.id,
        urutan: Number(m.urutan) || 0,
        produk_id: prodId,
        tanggal: (m.tanggal || m.date || new Date().toISOString()).slice(0, 10),
        created_at: m.created_at || new Date().toISOString(),
        stok_sebelumnya: Number(m.stok_sebelumnya) || 0,
        stok_terbaru: Number(m.stok_terbaru) || 0,
        perubahan: Number(m.perubahan) || 0,
        jumlah: Math.abs(Number(m.perubahan) || 0),
        jenis: m.jenis || 'Stok Harian',
        catatan: m.catatan || m.notes || '',
        payload: m.payload || {}
      };

      const mutRes = await fetch(`${url}/rest/v1/gambirono_mutasi_stok`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(mutObj)
      });
      if (!mutRes.ok) {
        console.error(`[SupabaseDB] Gagal menyimpan mutasi stok (HTTP ${mutRes.status})`);
      }
    }
  }

  return { changes: 1 };
}

/**
 * Fallback in-memory handler untuk unit test lokal
 */
function handleLocalFallback(operation, args) {
  if (operation === 'read') {
    return {
      revision: localRevision,
      owner_user_id: 'local-owner',
      data: JSON.stringify(localMemoryState)
    };
  }

  if (operation === 'update') {
    const nextStateStr = args[0];
    const expectedRev = Number(args[2]);

    if (expectedRev !== localRevision) {
      return { changes: 0 };
    }

    try {
      localMemoryState = JSON.parse(nextStateStr);
      localRevision += 1;
      return { changes: 1 };
    } catch {
      return { changes: 0 };
    }
  }

  if (operation === 'insert') {
    const stateStr = args[0];
    try {
      localMemoryState = JSON.parse(stateStr);
      localRevision = 1;
      return { changes: 1 };
    } catch {
      return { changes: 0 };
    }
  }

  if (operation === 'attempt') {
    return { attempts: 1 };
  }

  if (operation === 'cleanup') {
    return { changes: 1 };
  }

  throw new Error(`Operasi RPC tidak didukung: ${operation}`);
}

/**
 * Reset memory state untuk keperluan testing
 */
export function resetLocalMemory() {
  localMemoryState = JSON.parse(JSON.stringify(initialSchema1State));
  localRevision = 1;
}
