// ============================================================================
// server/core.js - Jamu Herbal State & Business Logic
// ============================================================================

export const DEFAULT_PRODUCTS = [
  { id: "prod-1793547155241", urutan: 3, kode: "H", nama: "Asam Urat Khusus Diabetes", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 2000 }, stock: 0, min_stock: 2000, buy_price: 5000 },
  { id: "prod-1793547155456", urutan: 4, kode: "KS", nama: "Kesemutan", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 2000 }, stock: 0, min_stock: 2000, buy_price: 5000 },
  { id: "prod-1793547155627", urutan: 5, kode: "SS", nama: "Sesak Nafas", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, buy_price: 5000, min_stock: 2000 }, stock: 0, min_stock: 2000, buy_price: 5000 },
  { id: "prod-1793547155763", urutan: 6, kode: "SP", nama: "Spesial", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, buy_price: 6000, min_stock: 2000 }, stock: 0, min_stock: 2000, buy_price: 6000 },
  { id: "prod-1793547155912", urutan: 7, kode: "M", nama: "Nyeri / Sakit Kepala", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 5000 },
  { id: "prod-1793547156043", urutan: 8, kode: "K", nama: "Kolesterol", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 5000 },
  { id: "prod-1793547156183", urutan: 9, kode: "O", nama: "Sakit Pinggang", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 5000 },
  { id: "prod-1793547156298", urutan: 10, kode: "P", nama: "Asam Urat", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 5000 },
  { id: "prod-1793547156431", urutan: 11, kode: "B", nama: "Pegelinu", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 5000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 5000 },
  { id: "prod-1793547156547", urutan: 12, kode: "HJ", nama: "Flu Batuk", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 6000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 6000 },
  { id: "prod-1793547156679", urutan: 13, kode: "PB", nama: "Lambung", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 6000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 6000 },
  { id: "prod-1793547156814", urutan: 14, kode: "PLS", nama: "Pelangsing", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 6000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 6000 },
  { id: "prod-1793547156935", urutan: 15, kode: "DRT", nama: "Darah Tinggi", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 7000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 7000 },
  { id: "prod-1793547157054", urutan: 16, kode: "KCM", nama: "Kencing Manis", satuan: "ml", harga: 10000, aktif: true, payload: { stock: 0, status: "Stok aman", buy_price: 7000, min_stock: 1000 }, stock: 0, min_stock: 1000, buy_price: 7000 }
];

export const DEFAULT_TRANSACTIONS = [
  { id: 'trx-1', urutan: 16, nomor: 'TRX-20261026-660EFE', invoice_no: 'TRX-20261026-660EFE', tanggal: '2026-10-26T17:30:00Z', total: 410000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-2', urutan: 15, nomor: 'TRX-20261024-163D53', invoice_no: 'TRX-20261024-163D53', tanggal: '2026-10-24T18:15:00Z', total: 390000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'QRIS' },
  { id: 'trx-3', urutan: 14, nomor: 'TRX-20261023-7C1437', invoice_no: 'TRX-20261023-7C1437', tanggal: '2026-10-23T16:45:00Z', total: 355000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-4', urutan: 13, nomor: 'TRX-20261022-D5148D', invoice_no: 'TRX-20261022-D5148D', tanggal: '2026-10-22T19:00:00Z', total: 455000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-5', urutan: 12, nomor: 'TRX-20261021-9C1212', invoice_no: 'TRX-20261021-9C1212', tanggal: '2026-10-21T18:30:00Z', total: 890000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'QRIS' },
  { id: 'trx-6', urutan: 11, nomor: 'TRX-20261019-331A12', invoice_no: 'TRX-20261019-331A12', tanggal: '2026-10-19T17:00:00Z', total: 245000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-7', urutan: 10, nomor: 'TRX-20261018-8A3319', invoice_no: 'TRX-20261018-8A3319', tanggal: '2026-10-18T17:00:00Z', total: 320000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-8', urutan: 9,  nomor: 'TRX-20261017-909BF1', invoice_no: 'TRX-20261017-909BF1', tanggal: '2026-10-17T18:00:00Z', total: 185000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'QRIS' },
  { id: 'trx-9', urutan: 8,  nomor: 'TRX-20261015-4B8210', invoice_no: 'TRX-20261015-4B8210', tanggal: '2026-10-15T15:20:00Z', total: 275000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Transfer' },
  { id: 'trx-10', urutan: 7, nomor: 'TRX-20261014-77A124', invoice_no: 'TRX-20261014-77A124', tanggal: '2026-10-14T17:15:00Z', total: 165000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-11', urutan: 6, nomor: 'TRX-20261012-302CD9', invoice_no: 'TRX-20261012-302CD9', tanggal: '2026-10-12T16:40:00Z', total: 210000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-12', urutan: 5, nomor: 'TRX-20261010-2C9914', invoice_no: 'TRX-20261010-2C9914', tanggal: '2026-10-10T16:00:00Z', total: 220000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-13', urutan: 4, nomor: 'TRX-20261008-118FA0', invoice_no: 'TRX-20261008-118FA0', tanggal: '2026-10-08T17:30:00Z', total: 175000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-14', urutan: 3, nomor: 'TRX-20261006-554EA1', invoice_no: 'TRX-20261006-554EA1', tanggal: '2026-10-06T18:10:00Z', total: 135000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'QRIS' },
  { id: 'trx-15', urutan: 2, nomor: 'TRX-20261004-902BC8', invoice_no: 'TRX-20261004-902BC8', tanggal: '2026-10-04T17:20:00Z', total: 142000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' },
  { id: 'trx-16', urutan: 1, nomor: 'TRX-20261002-4410E7', invoice_no: 'TRX-20261002-4410E7', tanggal: '2026-10-02T16:00:00Z', total: 115000, status: 'Tercatat', catatan: 'Pendapatan jamu', customer_name: 'Pendapatan jamu', payment_method: 'Tunai' }
];

// 14 Stok Harian (14 produk tanggal 26 Okt)
export const DEFAULT_DAILY_STOCKS = [
  { id: 'stock-26-1', urutan: 3, produk_id: 'prod-1793547155241', tanggal: '2026-10-26', jumlah: 3000, status: 'Stok aman' },
  { id: 'stock-26-2', urutan: 4, produk_id: 'prod-1793547155456', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-3', urutan: 5, produk_id: 'prod-1793547155627', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-4', urutan: 6, produk_id: 'prod-1793547155763', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-5', urutan: 7, produk_id: 'prod-1793547155912', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-6', urutan: 8, produk_id: 'prod-1793547156043', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-7', urutan: 9, produk_id: 'prod-1793547156183', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-8', urutan: 10, produk_id: 'prod-1793547156298', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-9', urutan: 11, produk_id: 'prod-1793547156431', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-10', urutan: 12, produk_id: 'prod-1793547156547', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-11', urutan: 13, produk_id: 'prod-1793547156679', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-12', urutan: 14, produk_id: 'prod-1793547156814', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-13', urutan: 15, produk_id: 'prod-1793547156935', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' },
  { id: 'stock-26-14', urutan: 16, produk_id: 'prod-1793547157054', tanggal: '2026-10-26', jumlah: 0, status: 'Stok menipis' }
];

export const INITIAL_PRODUCTION_STATE = {
  schemaVersion: 1,
  products: DEFAULT_PRODUCTS,
  sales: [],
  transactions: [],
  dailyStocks: [],
  stockEntries: [],
  stok_harian: [],
  stockMutations: [],
  moves: [],
  mutasi_stok: [],
  settings: {
    storeName: 'Jamu Herbal Gambirono',
    tagline: 'RUANG USAHA ANDA',
    timezone: 'Asia/Jakarta'
  },
  extra: {}
};

export const initialSchema1State = {
  schemaVersion: 1,
  products: DEFAULT_PRODUCTS,
  sales: [],
  transactions: [],
  dailyStocks: [],
  stok_harian: [],
  stockMutations: [],
  mutasi_stok: [],
  settings: {
    storeName: 'Jamu Herbal Gambirono',
    tagline: 'RUANG USAHA ANDA',
    timezone: 'Asia/Jakarta'
  },
  extra: {}
};

/**
 * Validasi aksi sebelum diterapkan ke state
 */
export function validateAction(action, payload, state) {
  if (!action) {
    throw new Error('Aksi tidak boleh kosong.');
  }

  const allowed = ['income', 'stocktake', 'variants', 'product', 'cancel', 'archive', 'settings', 'restore', 'migrate'];
  if (!allowed.includes(action)) {
    throw new Error(`Aksi "${action}" tidak didukung.`);
  }

  if (action === 'income') {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload income harus berupa objek.');
    }
    const total = Number(payload.total);
    if (isNaN(total) || total < 0) {
      throw new Error('Total pendapatan tidak valid.');
    }
  }

  if (action === 'stocktake') {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload stocktake harus berupa objek.');
    }
    if (!payload.date && !payload.tanggal) {
      throw new Error('Tanggal stocktake diperlukan.');
    }
  }

  if (action === 'product' || action === 'variants') {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload produk harus berupa objek.');
    }
    const name = payload.nama || payload.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Nama produk tidak boleh kosong.');
    }
  }

  if (action === 'cancel') {
    if (!payload || (!payload.id && !payload.nomor && !payload.invoice_no)) {
      throw new Error('ID atau nomor transaksi yang dibatalkan harus disertakan.');
    }
  }

  if (action === 'restore') {
    if (!payload || typeof payload !== 'object' || !payload.products) {
      throw new Error('Data cadangan untuk restore tidak valid.');
    }
  }
}

/**
 * Menerapkan aksi ke state secara deterministik
 */
export function applyAction(state, action, payload) {
  validateAction(action, payload, state);
  const next = JSON.parse(JSON.stringify(state));

  switch (action) {
    case 'income': {
      const now = new Date();
      const dateStr = (payload.tanggal || payload.date || now.toISOString().slice(0, 10)).slice(0, 10);
      const randomPart = Math.random().toString(16).substring(2, 8).toUpperCase();
      const datePart = dateStr.replace(/-/g, '');
      const invoiceNo = payload.nomor || payload.invoice_no || `TRX-${datePart}-${randomPart}`;
      
      const jamuTerjualMl = Math.max(0, Number(payload.jamu_terjual_ml || payload.jamuTerjualMl || 0));
      const restokMl = Math.max(0, Number(payload.restok_ml || payload.restokMl || 0));

      const newTrx = {
        id: payload.id || `trx-${Date.now()}-${randomPart}`,
        nomor: invoiceNo,
        invoice_no: invoiceNo,
        tanggal: dateStr,
        date: dateStr,
        total: Number(payload.total) || 0,
        status: payload.status || 'Tercatat',
        catatan: payload.catatan || payload.notes || payload.customer_name || 'Pendapatan jamu',
        customer_name: payload.customer_name || payload.catatan || 'Pendapatan jamu',
        payment_method: payload.payment_method || 'Tunai',
        jamu_terjual_ml: jamuTerjualMl,
        restok_ml: restokMl,
        items: payload.items || [],
        payload: {
          items: payload.items || [],
          payment_method: payload.payment_method || 'Tunai',
          customer_name: payload.customer_name || 'Pendapatan jamu',
          jamu_terjual_ml: jamuTerjualMl,
          restok_ml: restokMl
        }
      };

      const existingIndex = (next.transactions || []).findIndex(t => 
        t.tanggal === dateStr && 
        t.status !== 'Batal' && 
        t.status !== 'Dibatalkan'
      );

      if (existingIndex >= 0) {
        const existing = next.transactions[existingIndex];
        next.transactions[existingIndex] = {
          ...existing,
          ...newTrx,
          id: existing.id, // Keep the same ID
          nomor: existing.nomor, // Keep the same invoice number if desired, or update it
          created_at: existing.created_at,
          urutan: existing.urutan
        };
      } else {
        next.transactions = [newTrx, ...(next.transactions || [])];
      }
      next.sales = next.transactions;
      break;
    }

    case 'stocktake': {
      const date = payload.tanggal || payload.date || new Date().toISOString().slice(0, 10);
      const items = payload.items || payload.stocks || {};
      const statuses = payload.statuses || {};
      const nowIso = new Date().toISOString();

      // Pastikan mengambil daftar stok dari sumber mana pun yang tersedia
      let currentStocks = [
        ...(next.dailyStocks || next.stockEntries || next.stok_harian || [])
      ];
      let currentMutations = [
        ...(next.stockMutations || next.mutasi_stok || next.moves || [])
      ];

      // Hitung total stok sebelumnya
      const totalPrevStock = next.products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);

      Object.entries(items).forEach(([prodId, amount]) => {
        const qty = Math.max(0, Number(amount) || 0);
        const p = (next.products || []).find(x =>
          x.id === prodId ||
          x.kode === prodId ||
          x.code === prodId ||
          x.sku === prodId ||
          (prodId === 'ML' && (x.kode === 'ML' || x.sku === 'MADU LANANG' || x.nama === 'Madu Lanang')) ||
          (x.id === 'bd9a7a65-bcc0-5ae9-ba2d-2790cc7ab274' && (prodId === 'prod-15' || prodId === 'ML'))
        );
        
        const resolvedProdId = p ? p.id : prodId;
        const prodName = p ? p.nama : (p?.name || prodId);
        const prodCode = p ? (p.kode || p.code || p.sku) : prodId;
        
        const prevStock = p ? (Number(p.stock) || 0) : 0;
        const delta = qty - prevStock;
        // Global 1000ml rule for status
        const autoStatus = qty < 1000 ? 'Stok menipis' : 'Stok aman';
        const userStatus = autoStatus;

        if (p) {
          p.stock = qty;
          p.status = userStatus;
          p.last_updated = date;
          if (!p.payload) p.payload = {};
          p.payload.stock = qty;
          p.payload.status = userStatus;
          p.payload.last_updated = date;
        }

        const matchIdx = currentStocks.findIndex(s => {
          const sPid = s.produk_id || s.productId;
          const isSameProd = sPid === resolvedProdId;
          const sDate = s.tanggal || s.date;
          return isSameProd && sDate === date;
        });

        const record = {
          id: matchIdx >= 0 ? currentStocks[matchIdx].id : `stock-${Date.now()}-${resolvedProdId}-${Math.floor(Math.random() * 1000)}`,
          urutan: matchIdx >= 0 ? (currentStocks[matchIdx].urutan || 1) : (currentStocks.length + 1),
          produk_id: resolvedProdId,
          productId: resolvedProdId,
          tanggal: date,
          date: date,
          jumlah: qty,
          qty: qty,
          stock: qty,
          status: userStatus,
          payload: { 
            stock: qty, 
            status: userStatus,
            updated_at: nowIso
          }
        };

        if (matchIdx >= 0) {
          currentStocks[matchIdx] = record;
        } else {
          currentStocks.unshift(record);
        }

        if (delta !== 0) {
          const mutRecord = {
            id: `mut-${Date.now()}-${resolvedProdId}-${Math.floor(Math.random() * 1000)}`,
            urutan: currentMutations.length + 1,
            produk_id: resolvedProdId,
            productId: resolvedProdId,
            tanggal: date,
            date: date,
            created_at: nowIso,
            stok_sebelumnya: prevStock,
            stok_terbaru: qty,
            perubahan: delta,
            jumlah: Math.abs(delta),
            jenis: 'Stok Harian',
            catatan: `Update stok ${prodName} (${prodCode}): ${prevStock} ml ➔ ${qty} ml (${delta >= 0 ? '+' : ''}${delta} ml)`,
            payload: {
              stok_sebelumnya: prevStock,
              stok_terbaru: qty,
              perubahan: delta,
              created_at: nowIso
            }
          };
          currentMutations.unshift(mutRecord);
        }
      });

      // Hitung total stok terbaru
      const totalNewStock = next.products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
      const deltaTotal = totalNewStock - totalPrevStock;

      // Simpan ringkasan riwayat total stok toko
      const summaryRecord = {
        id: `total-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tanggal: date,
        waktu_update: nowIso,
        total_stok_sebelumnya: totalPrevStock,
        total_stok_terbaru: totalNewStock,
        perubahan_stok: deltaTotal,
        jenis_perubahan: deltaTotal > 0 ? 'Stok bertambah' : (deltaTotal < 0 ? 'Stok berkurang' : 'Tidak berubah'),
        keterangan: payload.catatan || payload.notes || `Input stok harian ${date}`,
        batch_id: `batch-${Date.now()}`
      };
      next.aggregateStockHistory = [summaryRecord, ...(next.aggregateStockHistory || [])];

      if (currentMutations.length > 500) {
        currentMutations = currentMutations.slice(0, 500);
      }

      next.dailyStocks = currentStocks;
      next.stockEntries = currentStocks;
      next.stok_harian = currentStocks;
      next.stockMutations = currentMutations;
      next.mutasi_stok = currentMutations;
      next.moves = currentMutations;
      break;
    }

    case 'product':
    case 'variants': {
      const prodId = payload.id || `prod-${Date.now()}`;
      const existingIdx = (next.products || []).findIndex(p => p.id === prodId || p.kode === payload.kode);
      const prevStock = existingIdx >= 0 ? Number(next.products[existingIdx].stock || 0) : 0;
      const newStock = Number(payload.stock !== undefined ? payload.stock : (existingIdx >= 0 ? prevStock : 0));
      const delta = newStock - prevStock;
      const nowIso = new Date().toISOString();
      const autoStatus = newStock < 1000 ? 'Stok menipis' : 'Stok aman';
      
      const updatedProd = {
        id: prodId,
        urutan: existingIdx >= 0 ? next.products[existingIdx].urutan : (next.products?.length || 0) + 1,
        kode: payload.kode || payload.code || payload.sku || 'JH',
        code: payload.kode || payload.code || payload.sku || 'JH',
        sku: payload.kode || payload.code || payload.sku || 'JH',
        nama: payload.nama || payload.name || 'Produk',
        name: payload.nama || payload.name || 'Produk',
        satuan: payload.satuan || payload.unit || 'ml',
        unit: payload.satuan || payload.unit || 'ml',
        harga: Number(payload.harga || payload.price || payload.sell_price || 0),
        price: Number(payload.harga || payload.price || payload.sell_price || 0),
        sell_price: Number(payload.harga || payload.price || payload.sell_price || 0),
        buy_price: Number(payload.buy_price || 0),
        stock: newStock,
        status: autoStatus,
        min_stock: Number(payload.min_stock !== undefined ? payload.min_stock : 1000),
        aktif: payload.aktif !== undefined ? Boolean(payload.aktif) : true,
        active: payload.aktif !== undefined ? Boolean(payload.aktif) : true,
        payload: {
          buy_price: Number(payload.buy_price || 0),
          stock: newStock,
          status: autoStatus,
          min_stock: Number(payload.min_stock !== undefined ? payload.min_stock : 1000)
        }
      };

      if (existingIdx >= 0) {
        next.products[existingIdx] = { ...next.products[existingIdx], ...updatedProd };
      } else {
        next.products.push(updatedProd);
      }

      if (existingIdx < 0 || delta !== 0) {
        let currentMutations = [
          ...(next.stockMutations || next.mutasi_stok || next.moves || [])
        ];
        const mutRecord = {
          id: `mut-${Date.now()}-${prodId}-${Math.floor(Math.random() * 1000)}`,
          urutan: currentMutations.length + 1,
          produk_id: prodId,
          productId: prodId,
          tanggal: nowIso.slice(0, 10),
          date: nowIso.slice(0, 10),
          created_at: nowIso,
          stok_sebelumnya: prevStock,
          stok_terbaru: newStock,
          perubahan: delta,
          jumlah: Math.abs(delta),
          jenis: existingIdx >= 0 ? 'Edit Produk' : 'Tambah Produk',
          catatan: existingIdx >= 0 ? `Update stok produk ${updatedProd.nama}: ${prevStock} ml ➔ ${newStock} ml` : `Produk baru ${updatedProd.nama} dengan stok awal ${newStock} ml`
        };
        currentMutations.unshift(mutRecord);
        next.stockMutations = currentMutations;
        next.mutasi_stok = currentMutations;
        next.moves = currentMutations;
      }
      break;
    }

    case 'cancel': {
      const targetId = payload.id || payload.nomor || payload.invoice_no;
      const trx = (next.transactions || []).find(t => t.id === targetId || t.nomor === targetId || t.invoice_no === targetId);
      if (trx) {
        trx.status = 'Batal';
        if (!trx.payload) trx.payload = {};
        trx.payload.cancellation_reason = payload.alasan || payload.reason || 'Dibatalkan pemilik';
        trx.payload.cancelled_at = new Date().toISOString();
      }
      next.sales = next.transactions;
      break;
    }

    case 'archive': {
      const beforeDate = payload.beforeDate || payload.tanggal;
      if (beforeDate) {
        const archived = (next.transactions || []).filter(t => t.tanggal < beforeDate);
        next.transactions = (next.transactions || []).filter(t => t.tanggal >= beforeDate);
        next.sales = next.transactions;
        next.archive = [...archived, ...(next.archive || [])];
      }
      break;
    }

    case 'settings': {
      next.settings = { ...next.settings, ...payload };
      break;
    }

    case 'restore': {
      return {
        schemaVersion: 1,
        products: payload.products || next.products,
        sales: payload.sales || payload.transactions || next.sales,
        transactions: payload.transactions || payload.sales || next.transactions,
        dailyStocks: payload.dailyStocks || payload.stok_harian || next.dailyStocks,
        stok_harian: payload.stok_harian || payload.dailyStocks || next.stok_harian,
        stockMutations: payload.stockMutations || next.stockMutations,
        mutasi_stok: payload.mutasi_stok || next.mutasi_stok,
        settings: payload.settings || next.settings,
        extra: payload.extra || next.extra
      };
    }

    case 'migrate': {
      next.schemaVersion = 1;
      break;
    }
  }

  return next;
}
