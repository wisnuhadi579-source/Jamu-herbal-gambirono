// ============================================================================
// server/store-service.js - Koordinasi Penyimpanan & Operasi Toko
// ============================================================================

import { applyAction, initialSchema1State } from './core.js';
import { callJamuStorage, getSupabaseConfig } from './supabase-db.js';

/**
 * Normalisasi state agar kompatibel dengan schema 1 dan antarmuka pengguna
 */
function normalizeState(state) {
  const products = state.products || [];
  const sales = state.sales || state.transactions || [];
  const stockEntries = state.stockEntries || state.dailyStocks || [];
  const moves = state.moves || state.stockMutations || [];

  // Hitung stok terkini per produk dari stockEntries
  const stockMap = {};
  const dateMap = {};
  [...stockEntries]
    .sort((a, b) => {
      const dateA = a.date || a.tanggal || '';
      const dateB = b.date || b.tanggal || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
    })
    .forEach(s => {
      const pId = s.productId || s.produk_id;
      if (pId) {
        stockMap[pId] = Number(s.qty !== undefined ? s.qty : (s.jumlah !== undefined ? s.jumlah : s.stock)) || 0;
        dateMap[pId] = s.date || s.tanggal;
      }
    });

  const normalizedProducts = products.map(p => {
    let currentStock = (p.stock !== undefined && p.stock !== null)
      ? Number(p.stock)
      : stockMap[p.id];
    if (currentStock === undefined && stockMap[p.kode] !== undefined) {
      currentStock = stockMap[p.kode];
    }
    if (currentStock === undefined && stockMap[p.code] !== undefined) {
      currentStock = stockMap[p.code];
    }
    if (currentStock === undefined) {
      const fromPayload = p.payload?.stock;
      currentStock = fromPayload !== undefined ? Number(fromPayload) : (Number(p.stock) || 0);
    }
    return {
      id: p.id,
      urutan: p.urutan || 0,
      code: p.code || p.kode || p.sku || 'JH',
      kode: p.kode || p.code || p.sku || 'JH',
      sku: p.code || p.kode || p.sku || 'JH',
      name: p.name || p.nama || 'Produk',
      nama: p.nama || p.name || 'Produk',
      unit: p.unit || p.satuan || 'BOTOL',
      satuan: p.satuan || p.unit || 'BOTOL',
      price: Number(p.price || p.harga || p.sell_price || 0),
      harga: Number(p.harga || p.price || p.sell_price || 0),
      sell_price: Number(p.sell_price || p.price || p.harga || 0),
      buy_price: Number(p.buy_price || 0),
      stock: currentStock,
      min_stock: Number(p.min_stock) || 2,
      active: p.active !== undefined ? p.active : (p.aktif !== undefined ? p.aktif : true),
      aktif: p.aktif !== undefined ? p.aktif : (p.active !== undefined ? p.active : true),
      last_updated: dateMap[p.id] || p.last_updated || '26 Okt 2026',
      payload: p.payload || {}
    };
  });

  const normalizedSales = sales.map(s => {
    let dateStr = s.tanggal || s.date || '';
    const num = s.number || s.nomor || s.invoice_no || '';
    const match = num.match(/TRX-(\d{4})(\d{2})(\d{2})/);
    if (match) {
      dateStr = `${match[1]}-${match[2]}-${match[3]}`;
    } else if (dateStr.length > 10) {
      dateStr = dateStr.slice(0, 10);
    }
    const createdAtStr = s.created_at || (s.payload && s.payload.created_at) || undefined;
    return {
      id: s.id,
      urutan: s.urutan ? Number(s.urutan) : 0,
      invoice_no: s.number || s.invoice_no || s.nomor || 'TRX',
      nomor: s.nomor || s.number || s.invoice_no || 'TRX',
      number: s.number || s.nomor || s.invoice_no || 'TRX',
      total: Number(s.total) || 0,
      date: dateStr,
      tanggal: dateStr,
      created_at: createdAtStr,
      status: s.status === 'valid' ? 'Tercatat' : s.status,
      notes: s.note || s.notes || s.catatan || '',
      catatan: s.catatan || s.note || s.notes || '',
      customer_name: s.customer_name || s.note || s.catatan || 'Pendapatan jamu',
      payment_method: s.payment_method || 'Tunai',
      items: s.items || [],
      payload: s.payload || {}
    };
  });

  normalizedSales.sort((a, b) => {
    const da = a.tanggal || a.date || '';
    const db = b.tanggal || b.date || '';
    const dateDiff = db.localeCompare(da);
    if (dateDiff !== 0) return dateDiff;
    const ca = a.created_at || '';
    const cb = b.created_at || '';
    if (ca && cb) {
      return cb.localeCompare(ca);
    }
    return (b.urutan || 0) - (a.urutan || 0);
  });

  const normalizedStocks = stockEntries.map(s => ({
    id: s.id,
    urutan: s.urutan || 0,
    productId: s.productId || s.produk_id,
    produk_id: s.produk_id || s.productId,
    date: s.date || s.tanggal,
    tanggal: s.tanggal || s.date,
    qty: Number(s.qty !== undefined ? s.qty : s.jumlah) || 0,
    jumlah: Number(s.jumlah !== undefined ? s.jumlah : s.qty) || 0,
    status: s.status === 'safe' ? 'Stok aman' : (s.status === 'low' ? 'Stok tipis' : s.status),
    payload: s.payload || {}
  }));

  return {
    schemaVersion: 1,
    schema: 1,
    products: normalizedProducts,
    sales: normalizedSales,
    transactions: normalizedSales,
    stockEntries: normalizedStocks,
    dailyStocks: normalizedStocks,
    stok_harian: normalizedStocks,
    moves,
    stockMutations: moves,
    mutasi_stok: moves,
    settings: state.settings || { name: 'Jamu Herbal Gambirono', zone: 'Asia/Jakarta' },
    extra: state.extra || {}
  };
}

/**
 * Dapatkan state toko saat ini
 */
export async function getStore(canEdit = true, env = {}) {
  const result = await callJamuStorage('read', [], env);

  const dbConfig = getSupabaseConfig(env);

  if (!result || !result.data) {
    await callJamuStorage('insert', [JSON.stringify(initialSchema1State), 'owner-code'], env);
    return {
      state: initialSchema1State,
      revision: 1,
      canEdit,
      configured: dbConfig.configured
    };
  }

  let state;
  try {
    state = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
  } catch (err) {
    console.error('[StoreService] Gagal mem-parse state JSON:', err);
    state = initialSchema1State;
  }

  const normalized = normalizeState(state);

  return {
    state: normalized,
    revision: Number(result.revision) || 1,
    canEdit,
    configured: dbConfig.configured
  };
}

/**
 * Update state toko berdasarkan aksi yang valid
 * Menolak pembaruan dari viewer (canEdit = false -> 403 Forbidden)
 * Mendeteksi konflik revisi (revision !== expected -> 409 Conflict)
 */
export async function updateStore({ revision, action, payload, state: directState }, canEdit = true, env = {}) {
  if (canEdit === false) {
    const err = new Error('Akses ditolak: hanya pemilik toko yang dapat mengubah data.');
    err.status = 403;
    throw err;
  }

  if (revision === undefined || revision === null) {
    const err = new Error('Parameter revision diperlukan untuk mencegah konflik.');
    err.status = 400;
    throw err;
  }

  const expectedRev = Number(revision);

  // Ambil state terkini dari database
  const current = await getStore(canEdit, env);

  if (current.revision !== expectedRev) {
    const conflictErr = new Error(`Konflik revisi: data di server (rev ${current.revision}) telah diperbarui oleh sesi lain.`);
    conflictErr.status = 409;
    conflictErr.currentRevision = current.revision;
    throw conflictErr;
  }

  // Terapkan aksi ke state terkini
  let nextState;
  if (action) {
    nextState = applyAction(current.state, action, payload);
  } else if (directState && typeof directState === 'object') {
    nextState = directState;
  } else {
    const err = new Error('Aksi atau state baru harus disertakan.');
    err.status = 400;
    throw err;
  }

  // Siapkan schema 1 payload untuk disimpan ke RPC
  const formattedProducts = (nextState.products || []).map(p => {
    const stockVal = Number(p.stock !== undefined ? p.stock : 0);
    return {
      id: p.id,
      urutan: p.urutan || 0,
      code: p.code || p.kode || p.sku || 'JH',
      kode: p.kode || p.code || p.sku || 'JH',
      sku: p.sku || p.kode || p.code || 'JH',
      name: p.name || p.nama || 'Produk',
      nama: p.nama || p.name || 'Produk',
      unit: p.unit || p.satuan || 'BOTOL',
      satuan: p.satuan || p.unit || 'BOTOL',
      price: Number(p.price || p.harga || p.sell_price || 0),
      harga: Number(p.harga || p.price || p.sell_price || 0),
      sell_price: Number(p.sell_price || p.price || p.harga || 0),
      buy_price: Number(p.buy_price || 0),
      stock: stockVal,
      active: p.active !== undefined ? p.active : true,
      aktif: p.aktif !== undefined ? p.aktif : true,
      payload: {
        ...(p.payload || {}),
        stock: stockVal,
        buy_price: Number(p.buy_price || 0),
        min_stock: Number(p.min_stock || 2)
      }
    };
  });

  const rawStocks = nextState.dailyStocks || nextState.stockEntries || nextState.stok_harian || [];
  const formattedStocks = rawStocks.map(s => {
    const qtyVal = Number(s.jumlah !== undefined ? s.jumlah : (s.qty !== undefined ? s.qty : s.stock)) || 0;
    const prodId = s.produk_id || s.productId;
    const dateVal = s.tanggal || s.date;
    return {
      id: s.id,
      urutan: s.urutan || 0,
      produk_id: prodId,
      productId: prodId,
      tanggal: dateVal,
      date: dateVal,
      jumlah: qtyVal,
      qty: qtyVal,
      stock: qtyVal,
      status: (s.status === 'low' || s.status === 'Stok menipis' || qtyVal <= 2) ? 'low' : 'safe',
      payload: s.payload || { stock: qtyVal, status: qtyVal > 2 ? 'Stok aman' : 'Stok menipis' }
    };
  });

  const formattedSales = (nextState.sales || nextState.transactions || []).map(s => {
    let dateStr = s.tanggal || s.date || '';
    if (dateStr.length > 10) {
      dateStr = dateStr.slice(0, 10);
    }
    const item = {
      id: s.id,
      number: s.number || s.nomor || s.invoice_no,
      nomor: s.nomor || s.number || s.invoice_no,
      date: dateStr,
      tanggal: dateStr,
      mode: 'income',
      total: Number(s.total) || 0,
      status: s.status === 'Tercatat' ? 'valid' : s.status,
      note: s.notes || s.catatan || '',
      catatan: s.catatan || s.notes || '',
      items: s.items || [],
      payload: s.payload || {}
    };
    if (s.urutan && Number(s.urutan) > 0) {
      item.urutan = Number(s.urutan);
    }
    if (s.created_at) {
      item.created_at = s.created_at;
    }
    return item;
  });

  const payloadToStore = {
    schema: 1,
    products: formattedProducts,
    sales: formattedSales,
    transactions: formattedSales,
    dailyStocks: formattedStocks,
    stok_harian: formattedStocks,
    stockEntries: formattedStocks,
    moves: nextState.moves || nextState.stockMutations || [],
    settings: nextState.settings || { name: 'Jamu Herbal Gambirono', zone: 'Asia/Jakarta' }
  };

  // Simpan ke Supabase RPC jamu_storage (update)
  const updateRes = await callJamuStorage('update', [
    JSON.stringify(payloadToStore),
    'owner-code',
    expectedRev
  ], env);

  if (!updateRes || updateRes.changes !== 1) {
    const conflictErr = new Error('Penyimpanan gagal karena terjadi konflik perubahan bersamaan.');
    conflictErr.status = 409;
    throw conflictErr;
  }

  const dbConfig = getSupabaseConfig(env);

  return {
    state: normalizeState(nextState),
    revision: expectedRev + 1,
    canEdit: true,
    configured: dbConfig.configured
  };
}
