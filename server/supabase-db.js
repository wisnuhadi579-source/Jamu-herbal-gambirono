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
  const url = (env.SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || '').trim().replace(/\/$/, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY : '') || '').trim();
  const configured = Boolean(url && key);
  return { url, key, configured };
}

/**
 * Panggil REST RPC gambirono_jamu_storage pada Supabase
 * Endpoint: ${SUPABASE_URL}/rest/v1/rpc/gambirono_jamu_storage
 * Headers:
 *   Content-Type: application/json
 *   apikey: SUPABASE_SERVICE_ROLE_KEY
 *   Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY
 * Body: { operation, args }
 */
export async function callJamuStorage(operation, args = [], env = {}) {
  const { url, key, configured } = getSupabaseConfig(env);

  // Jika Supabase belum dikonfigurasi di server, gunakan fallback in-memory untuk demo/preview
  if (!configured) {
    return handleLocalFallback(operation, args);
  }

  const endpoint = `${url}/rest/v1/rpc/gambirono_jamu_storage`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`
  };

  try {
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

    // Jika terjadi safeupdate error (DELETE requires a WHERE clause) dari RPC di PostgreSQL,
    // jalankan pembaruan langsung ke tabel gambirono terpisah menggunakan query ber-WHERE yang aman
    if (operation === 'update' && errText.includes('DELETE requires a WHERE clause')) {
      return await handleDirectTableUpdate(url, headers, args);
    }

    // Bila RPC belum dibuat di Supabase (misal SQL 003_Gambirono_Isolated_Database.sql belum dijalankan di SQL Editor)
    if (res.status === 404 || errText.includes('could not find the function') || errText.includes('PGRST202')) {
      console.warn('[GambironoStorage] RPC gambirono_jamu_storage belum ditemukan di Supabase. Jalankan 003_Gambirono_Isolated_Database.sql di SQL Editor.');
      return handleLocalFallback(operation, args);
    }

    throw new Error(`Supabase RPC Error (${res.status}): ${errText}`);
  } catch (err) {
    console.warn('[GambironoStorage] Gagal terhubung ke RPC Supabase Gambirono, memakai fallback memori:', err.message);
    return handleLocalFallback(operation, args);
  }
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
  if (!metaRes.ok) return { changes: 0 };
  const metaRows = await metaRes.json();
  const currentMeta = metaRows[0];
  if (!currentMeta || Number(currentMeta.revision) !== expectedRev) {
    return { changes: 0 }; // Konflik revisi!
  }

  const newRevision = expectedRev + 1;

  // 2. Update gambirono_jamu_meta
  await fetch(`${url}/rest/v1/gambirono_jamu_meta?id=eq.1`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      revision: newRevision,
      settings: nextState.settings || currentMeta.settings,
      extra: nextState.extra || currentMeta.extra
    })
  });

  // 3. Masukkan transaksi baru (jika ada) ke public.gambirono_transaksi_penjualan
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
        payload: trx.payload || trx
      };
      if (trx.urutan && Number(trx.urutan) > 0) {
        bodyObj.urutan = Number(trx.urutan);
      }

      await fetch(`${url}/rest/v1/gambirono_transaksi_penjualan`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(bodyObj)
      });
    }
  }

  // 4. Masukkan stok baru ke public.gambirono_stok_harian
  const stockEntries = nextState.dailyStocks || nextState.stockEntries || nextState.stok_harian || [];
  if (stockEntries.length > 0) {
    for (const s of stockEntries) {
      const prodId = s.productId || s.produk_id;
      const date = s.date || s.tanggal;
      const qty = Number(s.qty !== undefined ? s.qty : (s.jumlah !== undefined ? s.jumlah : s.stock)) || 0;
      const statusEnum = qty > 2 ? 'safe' : 'low';
      if (prodId && date) {
        await fetch(`${url}/rest/v1/gambirono_stok_harian?on_conflict=produk_id,tanggal`, {
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

  return { changes: 1 };
}

/**
 * Fallback in-memory handler dengan kontrak persis seperti RPC SQL gambirono_jamu_storage
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
