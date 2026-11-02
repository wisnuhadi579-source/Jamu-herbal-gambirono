// ============================================================================
// server/store-service.js - Koordinasi Penyimpanan & Operasi Toko
// ============================================================================

import { applyAction, initialSchema1State, INITIAL_PRODUCTION_STATE, DEFAULT_PRODUCTS, DEFAULT_TRANSACTIONS, DEFAULT_DAILY_STOCKS } from './core.js';
import { callJamuStorage, getSupabaseConfig } from './supabase-db.js';

/**
 * Normalisasi state agar kompatibel dengan schema 1 dan antarmuka pengguna
 */
function normalizeState(state) {
  let products = state.products || [];
  // Ensure we have the basic 14 products if nothing is in DB
  if (products.length === 0) {
    products = DEFAULT_PRODUCTS;
  }

  let sales = state.sales || state.transactions || [];
  let stockEntries = state.stockEntries || state.dailyStocks || state.stok_harian || [];
  // Map product codes/IDs to resolved product IDs for foreign key integrity
  const resolveProductId = (pid) => {
    if (!pid) return pid;
    const found = products.find(p => p.id === pid || p.kode === pid || p.code === pid || p.sku === pid);
    if (found) return found.id;
    const match = String(pid).match(/^prod-(\d+)$/);
    if (match) {
      const idx = Number(match[1]) - 1;
      if (products[idx]) return products[idx].id;
    }
    return pid;
  };

  const moves = (state.moves || state.stockMutations || state.mutasi_stok || []).map(m => {
    const prodId = resolveProductId(m.produk_id || m.productId);
    const prevStock = Number(m.stok_sebelumnya !== undefined ? m.stok_sebelumnya : ((m.payload && m.payload.stok_sebelumnya) || 0));
    const newStock = Number(m.stok_terbaru !== undefined ? m.stok_terbaru : ((m.payload && m.payload.stok_terbaru) || m.jumlah || m.qty || 0));
    const delta = Number(m.perubahan !== undefined ? m.perubahan : ((m.payload && m.payload.perubahan) !== undefined ? m.payload.perubahan : (newStock - prevStock)));
    const dateVal = String(m.tanggal || m.date || (m.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const createdAt = String(m.created_at || (m.payload && m.payload.created_at) || `${dateVal}T12:00:00Z`);
    return {
      id: String(m.id || `mut-${Date.now()}`),
      urutan: Number(m.urutan || 0),
      produk_id: prodId,
      productId: prodId,
      tanggal: dateVal,
      date: dateVal,
      created_at: createdAt,
      stok_sebelumnya: prevStock,
      stok_terbaru: newStock,
      perubahan: delta,
      jumlah: Math.abs(delta),
      jenis: String(m.jenis || 'Stok Harian'),
      catatan: String(m.catatan || m.notes || m.note || ''),
      payload: m.payload || {}
    };
  });

  moves.sort((a, b) => {
    const ca = a.created_at || `${a.tanggal}T12:00:00Z`;
    const cb = b.created_at || `${b.tanggal}T12:00:00Z`;
    return cb.localeCompare(ca);
  });

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

  const isInactiveCode = (code, id, name) => {
    const uCode = String(code || '').trim().toUpperCase();
    const uName = String(name || '').trim().toUpperCase();
    return uCode === 'ML' || uCode === 'MADU LANANG' || uCode === 'TST_4666' || uName === 'MADU LANANG' || uName === 'ML' || uName === 'TST_4666' || id === 'prod-15';
  };

  const normalizedProducts = products.map(p => {
    const prodCode = p.code || p.kode || p.sku || 'JH';
    const prodName = p.name || p.nama || 'Produk';
    const forceInactive = isInactiveCode(prodCode, p.id, prodName);
    const isAct = forceInactive ? false : (p.active !== undefined ? Boolean(p.active) : (p.aktif !== undefined ? Boolean(p.aktif) : true));

    // Prefer snapshot from stok_harian, then payload, then p.stock
    let currentStock = stockMap[p.id];
    if (currentStock === undefined) currentStock = stockMap[prodCode];
    if (currentStock === undefined) currentStock = p.payload?.stock;
    if (currentStock === undefined) currentStock = p.stock;
    
    const finalStock = Number(currentStock || 0);
    const lastUpdate = dateMap[p.id] || p.last_updated || null;

    return {
      id: p.id,
      urutan: p.urutan || 0,
      code: prodCode,
      kode: prodCode,
      sku: prodCode,
      name: prodName,
      nama: prodName,
      unit: p.unit || p.satuan || 'ml',
      satuan: p.satuan || p.unit || 'ml',
      price: Number(p.price || p.harga || p.sell_price || 0),
      harga: Number(p.harga || p.price || p.sell_price || 0),
      sell_price: Number(p.sell_price || p.price || p.harga || 0),
      buy_price: Number(p.buy_price || 0),
      stock: finalStock,
      min_stock: Number(p.min_stock) || 200,
      active: isAct,
      aktif: isAct,
      last_updated: lastUpdate,
      payload: {
        ...(p.payload || {}),
        stock: finalStock,
        active: isAct,
        aktif: isAct
      }
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
    const jamuTerjualMl = Math.max(0, Number(s.jamu_terjual_ml || (s.payload && s.payload.jamu_terjual_ml) || 0));
    const restokMl = Math.max(0, Number(s.restok_ml || (s.payload && s.payload.restok_ml) || 0));
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
      jamu_terjual_ml: jamuTerjualMl,
      restok_ml: restokMl,
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

  const normalizedStocks = stockEntries.map(s => {
    const pid = resolveProductId(s.productId || s.produk_id);
    return {
      id: s.id,
      urutan: s.urutan || 0,
      productId: pid,
      produk_id: pid,
      date: s.date || s.tanggal,
      tanggal: s.tanggal || s.date,
      qty: Number(s.qty !== undefined ? s.qty : s.jumlah) || 0,
      jumlah: Number(s.jumlah !== undefined ? s.jumlah : s.qty) || 0,
      status: s.status === 'safe' ? 'Stok aman' : (s.status === 'low' ? 'Stok tipis' : s.status),
      payload: s.payload || {}
    };
  });

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
    console.log('[StoreService] State kosong di DB, menginisialisasi dengan INITIAL_PRODUCTION_STATE');
    await callJamuStorage('insert', [JSON.stringify(INITIAL_PRODUCTION_STATE), 'owner-code'], env);
    return {
      state: INITIAL_PRODUCTION_STATE,
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
    state = INITIAL_PRODUCTION_STATE;
  }

  // Diagnostic Logs
  const dbProducts = state.products || [];
  const dbSales = state.sales || state.transactions || [];
  const dbStocks = state.dailyStocks || state.stok_harian || [];
  const dbMoves = state.moves || state.stockMutations || state.mutasi_stok || [];
  
  console.log(`[StoreService] RPC Read Berhasil (Rev ${result.revision}):`);
  console.log(` - Produk: ${dbProducts.length}`);
  console.log(` - Transaksi: ${dbSales.length}`);
  console.log(` - Snapshot Stok: ${dbStocks.length}`);
  console.log(` - Riwayat Mutasi: ${dbMoves.length}`);
  
  if (dbStocks.length > 0) {
    const dates = [...new Set(dbStocks.map(s => s.tanggal || s.date))].sort().reverse();
    console.log(` - Tanggal Stok Tersedia: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}`);
    
    // Count items per date for Nov 1 & 2
    ['2026-11-01', '2026-11-02'].forEach(d => {
      const count = dbStocks.filter(s => (s.tanggal === d || s.date === d)).length;
      if (count > 0) console.log(`   * ${d}: ${count} snapshot`);
    });
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
      unit: p.unit || p.satuan || 'ml',
      satuan: p.satuan || p.unit || 'ml',
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
    const jamuTerjualMl = Math.max(0, Number(s.jamu_terjual_ml || (s.payload && s.payload.jamu_terjual_ml) || 0));
    const restokMl = Math.max(0, Number(s.restok_ml || (s.payload && s.payload.restok_ml) || 0));
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
      jamu_terjual_ml: jamuTerjualMl,
      restok_ml: restokMl,
      items: s.items || [],
      payload: {
        ...(s.payload || {}),
        jamu_terjual_ml: jamuTerjualMl,
        restok_ml: restokMl
      }
    };
    if (s.urutan && Number(s.urutan) > 0) {
      item.urutan = Number(s.urutan);
    }
    if (s.created_at) {
      item.created_at = s.created_at;
    }
    return item;
  });

  const formattedMoves = (nextState.stockMutations || nextState.mutasi_stok || nextState.moves || []).map(m => {
    const prodId = m.produk_id || m.productId;
    const dateVal = String(m.tanggal || m.date || (m.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const createdAt = String(m.created_at || `${dateVal}T12:00:00Z`);
    const prevStock = Number(m.stok_sebelumnya || 0);
    const newStock = Number(m.stok_terbaru || 0);
    const delta = Number(m.perubahan !== undefined ? m.perubahan : (newStock - prevStock));
    return {
      id: String(m.id || `mut-${Date.now()}`),
      urutan: Number(m.urutan || 0),
      produk_id: prodId,
      productId: prodId,
      tanggal: dateVal,
      date: dateVal,
      created_at: createdAt,
      stok_sebelumnya: prevStock,
      stok_terbaru: newStock,
      perubahan: delta,
      jumlah: Math.abs(delta),
      jenis: String(m.jenis || 'Stok Harian'),
      catatan: String(m.catatan || m.notes || ''),
      payload: m.payload || { stok_sebelumnya: prevStock, stok_terbaru: newStock, perubahan: delta }
    };
  });

  const payloadToStore = {
    schema: 1,
    products: formattedProducts,
    sales: formattedSales,
    transactions: formattedSales,
    dailyStocks: formattedStocks,
    stok_harian: formattedStocks,
    stockEntries: formattedStocks,
    moves: formattedMoves,
    stockMutations: formattedMoves,
    mutasi_stok: formattedMoves,
    settings: nextState.settings || { name: 'Jamu Herbal Gambirono', zone: 'Asia/Jakarta' }
  };

  console.log(`[StoreService] Menyimpan ke RPC (Rev ${expectedRev} -> ${expectedRev + 1}):`);
  console.log(` - Produk: ${formattedProducts.length}`);
  console.log(` - Transaksi: ${formattedSales.length}`);
  console.log(` - Snapshot Stok: ${formattedStocks.length}`);
  console.log(` - Mutasi Baru: ${formattedMoves.length}`);

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
