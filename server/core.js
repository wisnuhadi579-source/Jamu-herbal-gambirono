// ============================================================================
// server/core.js - Jamu Herbal State & Business Logic
// ============================================================================

export const DEFAULT_PRODUCTS = [
  { id: 'prod-1', urutan: 1, kode: 'H', code: 'H', sku: 'H', nama: 'Habba', name: 'Habba', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 10, min_stock: 3, aktif: true, active: true },
  { id: 'prod-2', urutan: 2, kode: 'KS', code: 'KS', sku: 'KS', nama: 'Kunyit Sirih', name: 'Kunyit Sirih', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 12, min_stock: 3, aktif: true, active: true },
  { id: 'prod-3', urutan: 3, kode: 'SS', code: 'SS', sku: 'SS', nama: 'Sirih Sereh', name: 'Sirih Sereh', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 4, min_stock: 2, aktif: true, active: true },
  { id: 'prod-4', urutan: 4, kode: 'SP', code: 'SP', sku: 'SP', nama: 'Sambiloto', name: 'Sambiloto', satuan: 'BOTOL', unit: 'BOTOL', harga: 9000, price: 9000, sell_price: 9000, buy_price: 6000, stock: 10, min_stock: 3, aktif: true, active: true },
  { id: 'prod-5', urutan: 5, kode: 'M', code: 'M', sku: 'M', nama: 'Mengkudu', name: 'Mengkudu', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 7, min_stock: 2, aktif: true, active: true },
  { id: 'prod-6', urutan: 6, kode: 'K', code: 'K', sku: 'K', nama: 'Kencur', name: 'Kencur', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 4, min_stock: 2, aktif: true, active: true },
  { id: 'prod-7', urutan: 7, kode: 'O', code: 'O', sku: 'O', nama: 'Olahan', name: 'Olahan', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 14, min_stock: 3, aktif: true, active: true },
  { id: 'prod-8', urutan: 8, kode: 'P', code: 'P', sku: 'P', nama: 'Pahit', name: 'Pahit', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 3, min_stock: 2, aktif: true, active: true },
  { id: 'prod-9', urutan: 9, kode: 'B', code: 'B', sku: 'B', nama: 'Beras Kencur', name: 'Beras Kencur', satuan: 'BOTOL', unit: 'BOTOL', harga: 8000, price: 8000, sell_price: 8000, buy_price: 5000, stock: 3, min_stock: 2, aktif: true, active: true },
  { id: 'prod-10', urutan: 10, kode: 'HJ', code: 'HJ', sku: 'HJ', nama: 'Herbal Jahe', name: 'Herbal Jahe', satuan: 'BOTOL', unit: 'BOTOL', harga: 9000, price: 9000, sell_price: 9000, buy_price: 6000, stock: 7, min_stock: 2, aktif: true, active: true },
  { id: 'prod-11', urutan: 11, kode: 'PB', code: 'PB', sku: 'PB', nama: 'Pahit Brotowali', name: 'Pahit Brotowali', satuan: 'BOTOL', unit: 'BOTOL', harga: 9000, price: 9000, sell_price: 9000, buy_price: 6000, stock: 5, min_stock: 2, aktif: true, active: true },
  { id: 'prod-12', urutan: 12, kode: 'PLS', code: 'PLS', sku: 'PLS', nama: 'Pegal Linu Super', name: 'Pegal Linu Super', satuan: 'BOTOL', unit: 'BOTOL', harga: 9000, price: 9000, sell_price: 9000, buy_price: 6000, stock: 3, min_stock: 2, aktif: true, active: true },
  { id: 'prod-13', urutan: 13, kode: 'DRT', code: 'DRT', sku: 'DRT', nama: 'Darah Tinggi', name: 'Darah Tinggi', satuan: 'BOTOL', unit: 'BOTOL', harga: 10000, price: 10000, sell_price: 10000, buy_price: 7000, stock: 3, min_stock: 2, aktif: true, active: true },
  { id: 'prod-14', urutan: 14, kode: 'KCM', code: 'KCM', sku: 'KCM', nama: 'Kencing Manis', name: 'Kencing Manis', satuan: 'BOTOL', unit: 'BOTOL', harga: 10000, price: 10000, sell_price: 10000, buy_price: 7000, stock: 2, min_stock: 2, aktif: true, active: true },
  { id: 'prod-15', urutan: 15, kode: 'ML', code: 'ML', sku: 'MADU LANANG', nama: 'Madu Lanang', name: 'Madu Lanang', satuan: 'PCS', unit: 'PCS', harga: 25000, price: 25000, sell_price: 25000, buy_price: 15000, stock: 28, min_stock: 5, aktif: true, active: true }
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

// 30 Stok Harian (15 produk tanggal 26 Okt + 15 produk tanggal 24 Okt)
export const DEFAULT_DAILY_STOCKS = [
  // Tanggal 26 Okt (15 produk)
  { id: 'stock-26-1', urutan: 1, produk_id: 'prod-1', tanggal: '2026-10-26', jumlah: 10, status: 'Stok aman' },
  { id: 'stock-26-2', urutan: 2, produk_id: 'prod-2', tanggal: '2026-10-26', jumlah: 12, status: 'Stok aman' },
  { id: 'stock-26-3', urutan: 3, produk_id: 'prod-3', tanggal: '2026-10-26', jumlah: 4,  status: 'Stok aman' },
  { id: 'stock-26-4', urutan: 4, produk_id: 'prod-4', tanggal: '2026-10-26', jumlah: 10, status: 'Stok aman' },
  { id: 'stock-26-5', urutan: 5, produk_id: 'prod-5', tanggal: '2026-10-26', jumlah: 7,  status: 'Stok aman' },
  { id: 'stock-26-6', urutan: 6, produk_id: 'prod-6', tanggal: '2026-10-26', jumlah: 4,  status: 'Stok aman' },
  { id: 'stock-26-7', urutan: 7, produk_id: 'prod-7', tanggal: '2026-10-26', jumlah: 14, status: 'Stok aman' },
  { id: 'stock-26-8', urutan: 8, produk_id: 'prod-8', tanggal: '2026-10-26', jumlah: 3,  status: 'Stok aman' },
  { id: 'stock-26-9', urutan: 9, produk_id: 'prod-9', tanggal: '2026-10-26', jumlah: 3,  status: 'Stok aman' },
  { id: 'stock-26-10', urutan: 10, produk_id: 'prod-10', tanggal: '2026-10-26', jumlah: 7, status: 'Stok aman' },
  { id: 'stock-26-11', urutan: 11, produk_id: 'prod-11', tanggal: '2026-10-26', jumlah: 5, status: 'Stok aman' },
  { id: 'stock-26-12', urutan: 12, produk_id: 'prod-12', tanggal: '2026-10-26', jumlah: 3, status: 'Stok aman' },
  { id: 'stock-26-13', urutan: 13, produk_id: 'prod-13', tanggal: '2026-10-26', jumlah: 3, status: 'Stok aman' },
  { id: 'stock-26-14', urutan: 14, produk_id: 'prod-14', tanggal: '2026-10-26', jumlah: 2, status: 'Stok aman' },
  { id: 'stock-26-15', urutan: 15, produk_id: 'prod-15', tanggal: '2026-10-26', jumlah: 28, status: 'Stok aman' },
  // Tanggal 24 Okt (15 produk)
  { id: 'stock-24-1', urutan: 16, produk_id: 'prod-1', tanggal: '2026-10-24', jumlah: 12, status: 'Stok aman' },
  { id: 'stock-24-2', urutan: 17, produk_id: 'prod-2', tanggal: '2026-10-24', jumlah: 14, status: 'Stok aman' },
  { id: 'stock-24-3', urutan: 18, produk_id: 'prod-3', tanggal: '2026-10-24', jumlah: 5,  status: 'Stok aman' },
  { id: 'stock-24-4', urutan: 19, produk_id: 'prod-4', tanggal: '2026-10-24', jumlah: 11, status: 'Stok aman' },
  { id: 'stock-24-5', urutan: 20, produk_id: 'prod-5', tanggal: '2026-10-24', jumlah: 8,  status: 'Stok aman' },
  { id: 'stock-24-6', urutan: 21, produk_id: 'prod-6', tanggal: '2026-10-24', jumlah: 6,  status: 'Stok aman' },
  { id: 'stock-24-7', urutan: 22, produk_id: 'prod-7', tanggal: '2026-10-24', jumlah: 15, status: 'Stok aman' },
  { id: 'stock-24-8', urutan: 23, produk_id: 'prod-8', tanggal: '2026-10-24', jumlah: 4,  status: 'Stok aman' },
  { id: 'stock-24-9', urutan: 24, produk_id: 'prod-9', tanggal: '2026-10-24', jumlah: 5,  status: 'Stok aman' },
  { id: 'stock-24-10', urutan: 25, produk_id: 'prod-10', tanggal: '2026-10-24', jumlah: 8, status: 'Stok aman' },
  { id: 'stock-24-11', urutan: 26, produk_id: 'prod-11', tanggal: '2026-10-24', jumlah: 6, status: 'Stok aman' },
  { id: 'stock-24-12', urutan: 27, produk_id: 'prod-12', tanggal: '2026-10-24', jumlah: 4, status: 'Stok aman' },
  { id: 'stock-24-13', urutan: 28, produk_id: 'prod-13', tanggal: '2026-10-24', jumlah: 4, status: 'Stok aman' },
  { id: 'stock-24-14', urutan: 29, produk_id: 'prod-14', tanggal: '2026-10-24', jumlah: 3, status: 'Stok aman' },
  { id: 'stock-24-15', urutan: 30, produk_id: 'prod-15', tanggal: '2026-10-24', jumlah: 30, status: 'Stok aman' }
];

export const initialSchema1State = {
  schemaVersion: 1,
  products: DEFAULT_PRODUCTS,
  sales: DEFAULT_TRANSACTIONS,
  transactions: DEFAULT_TRANSACTIONS,
  dailyStocks: DEFAULT_DAILY_STOCKS,
  stok_harian: DEFAULT_DAILY_STOCKS,
  stockMutations: [],
  mutasi_stok: [],
  settings: {
    storeName: 'Jamu Herbal Gambirono',
    tagline: 'RUANG USAHA ANDA',
    ownerCodeConfigured: true,
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
      
      const newTrx = {
        id: payload.id || `trx-${Date.now()}-${randomPart}`,
        nomor: invoiceNo,
        invoice_no: invoiceNo,
        tanggal: dateStr,
        date: dateStr,
        total: Number(payload.total) || 0,
        status: 'Tercatat',
        catatan: payload.catatan || payload.notes || payload.customer_name || 'Pendapatan jamu',
        customer_name: payload.customer_name || payload.catatan || 'Pendapatan jamu',
        payment_method: payload.payment_method || 'Tunai',
        items: payload.items || [],
        payload: {
          items: payload.items || [],
          payment_method: payload.payment_method || 'Tunai',
          customer_name: payload.customer_name || 'Pendapatan jamu'
        }
      };

      const existingIndex = (next.transactions || []).findIndex(t => t.id === newTrx.id);
      if (existingIndex >= 0) {
        next.transactions[existingIndex] = {
          ...next.transactions[existingIndex],
          ...newTrx,
          created_at: next.transactions[existingIndex].created_at,
          urutan: next.transactions[existingIndex].urutan
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

      // Pastikan mengambil daftar stok dari sumber mana pun yang tersedia
      let currentStocks = [
        ...(next.dailyStocks || next.stockEntries || next.stok_harian || [])
      ];

      Object.entries(items).forEach(([prodId, amount]) => {
        const qty = Math.max(0, Number(amount) || 0);
        // Cari produk berdasarkan ID, kode, code, atau sku
        const p = (next.products || []).find(x =>
          x.id === prodId ||
          x.kode === prodId ||
          x.code === prodId ||
          x.sku === prodId ||
          (prodId === 'ML' && (x.kode === 'ML' || x.sku === 'MADU LANANG' || x.nama === 'Madu Lanang' || x.name === 'Madu Lanang')) ||
          (x.id === 'bd9a7a65-bcc0-5ae9-ba2d-2790cc7ab274' && (prodId === 'prod-15' || prodId === 'ML'))
        );
        const resolvedProdId = p ? p.id : prodId;
        const userStatus = statuses[prodId] || (p && statuses[p.id]) || (qty > (p?.min_stock || 2) ? 'Stok aman' : 'Stok menipis');

        if (p) {
          p.stock = qty;
          p.status = userStatus;
          p.last_updated = date;
          if (!p.payload) p.payload = {};
          p.payload.stock = qty;
          p.payload.status = userStatus;
        }

        // Cari atau perbarui entri stok harian untuk produk dan tanggal ini
        const matchIdx = currentStocks.findIndex(s => {
          const sPid = s.produk_id || s.productId;
          const isSameProd = sPid === resolvedProdId || (p && (sPid === p.id || sPid === p.kode || sPid === p.code || sPid === p.sku));
          const sDate = s.tanggal || s.date;
          return isSameProd && sDate === date;
        });

        const record = {
          id: matchIdx >= 0 ? currentStocks[matchIdx].id : `stock-${Date.now()}-${resolvedProdId}`,
          urutan: matchIdx >= 0 ? (currentStocks[matchIdx].urutan || 1) : (currentStocks.length + 1),
          produk_id: resolvedProdId,
          productId: resolvedProdId,
          tanggal: date,
          date: date,
          jumlah: qty,
          qty: qty,
          stock: qty,
          status: userStatus,
          payload: { stock: qty, status: userStatus }
        };

        if (matchIdx >= 0) {
          currentStocks[matchIdx] = record;
        } else {
          currentStocks.unshift(record);
        }
      });

      // Terapkan ke semua nama properti agar konsisten
      next.dailyStocks = currentStocks;
      next.stockEntries = currentStocks;
      next.stok_harian = currentStocks;
      break;
    }

    case 'product':
    case 'variants': {
      const prodId = payload.id || `prod-${Date.now()}`;
      const existingIdx = (next.products || []).findIndex(p => p.id === prodId || p.kode === payload.kode);
      
      const updatedProd = {
        id: prodId,
        urutan: existingIdx >= 0 ? next.products[existingIdx].urutan : (next.products?.length || 0) + 1,
        kode: payload.kode || payload.code || payload.sku || 'JH',
        code: payload.kode || payload.code || payload.sku || 'JH',
        sku: payload.kode || payload.code || payload.sku || 'JH',
        nama: payload.nama || payload.name || 'Produk',
        name: payload.nama || payload.name || 'Produk',
        satuan: payload.satuan || payload.unit || 'BOTOL',
        unit: payload.satuan || payload.unit || 'BOTOL',
        harga: Number(payload.harga || payload.price || payload.sell_price || 0),
        price: Number(payload.harga || payload.price || payload.sell_price || 0),
        sell_price: Number(payload.harga || payload.price || payload.sell_price || 0),
        buy_price: Number(payload.buy_price || 0),
        stock: Number(payload.stock !== undefined ? payload.stock : 0),
        min_stock: Number(payload.min_stock !== undefined ? payload.min_stock : 2),
        aktif: payload.aktif !== undefined ? Boolean(payload.aktif) : true,
        active: payload.aktif !== undefined ? Boolean(payload.aktif) : true,
        payload: {
          buy_price: Number(payload.buy_price || 0),
          stock: Number(payload.stock !== undefined ? payload.stock : 0),
          min_stock: Number(payload.min_stock !== undefined ? payload.min_stock : 2)
        }
      };

      if (existingIdx >= 0) {
        next.products[existingIdx] = { ...next.products[existingIdx], ...updatedProd };
      } else {
        next.products.push(updatedProd);
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
