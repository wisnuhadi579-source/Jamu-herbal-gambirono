import type { Product, Sale, SaleItem, StockMutation } from "../types";

export let currentRevision = 1;
export let canEditState = true;
export let isSupabaseConfigured = true;

export function getOwnerToken(): string | null {
  return null;
}

export function setOwnerToken(_token: string | null) {}

export function getAuthHeaders(): Record<string, string> {
  return {};
}

export const demoProducts: Product[] = [
  { id: "prod-1793547155241", sku: "H", code: "H", name: "Asam Urat Khusus Diabetes", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 2000, last_updated: null },
  { id: "prod-1793547155456", sku: "KS", code: "KS", name: "Kesemutan", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 2000, last_updated: null },
  { id: "prod-1793547155627", sku: "SS", code: "SS", name: "Sesak Nafas", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 2000, last_updated: null },
  { id: "prod-1793547155763", sku: "SP", code: "SP", name: "Spesial", category: "Jamu Cair", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 2000, last_updated: null },
  { id: "prod-1793547155912", sku: "M", code: "M", name: "Nyeri / Sakit Kepala", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156043", sku: "K", code: "K", name: "Kolesterol", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156183", sku: "O", code: "O", name: "Sakit Pinggang", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156298", sku: "P", code: "P", name: "Asam Urat", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156431", sku: "B", code: "B", name: "Pegelinu", category: "Jamu Cair", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156547", sku: "HJ", code: "HJ", name: "Flu Batuk", category: "Jamu Cair", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156679", sku: "PB", code: "PB", name: "Lambung", category: "Jamu Cair", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156814", sku: "PLS", code: "PLS", name: "Pelangsing", category: "Jamu Cair", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547156935", sku: "DRT", code: "DRT", name: "Darah Tinggi", category: "Jamu Cair", unit: "ml", buy_price: 7000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null },
  { id: "prod-1793547157054", sku: "KCM", code: "KCM", name: "Kencing Manis", category: "Jamu Cair", unit: "ml", buy_price: 7000, sell_price: 10000, stock: 0, min_stock: 1000, last_updated: null }
];

export const demoSales: Sale[] = [];

function parseStateResponse(rawState: any, rev: number) {
  const state = typeof rawState === "string" ? JSON.parse(rawState) : (rawState || {});
  currentRevision = Number(rev) || currentRevision || 1;

  const products: Product[] = (state.products || []).map((p: Record<string, unknown>) => ({
    id: String(p.id || ""),
    sku: String(p.sku || p.kode || p.code || ""),
    code: String(p.code || p.kode || p.sku || ""),
    name: String(p.name || p.nama || ""),
    category: String(p.category || "Jamu Cair"),
    unit: String(p.unit || p.satuan || "ml"),
    buy_price: Number(p.buy_price || 0),
    sell_price: Number(p.sell_price || p.price || p.harga || 0),
    stock: Number(p.stock !== undefined ? p.stock : 0),
    min_stock: Number(p.min_stock !== undefined ? p.min_stock : 200),
    status: String(p.status || (p.payload as Record<string, unknown>)?.status || (Number(p.stock || 0) <= Number(p.min_stock || 200) ? "Stok menipis" : "Stok aman")),
    last_updated: null
  }));

  const sales: Sale[] = (state.transactions || state.sales || []).map((s: Record<string, unknown>) => {
    const invoiceNo = String(s.invoice_no || s.nomor || s.number || "");
    let dateStr = String(s.tanggal || s.date || "");
    const match = invoiceNo.match(/TRX-(\d{4})(\d{2})(\d{2})/);
    if (match) {
      dateStr = `${match[1]}-${match[2]}-${match[3]}`;
    } else if (dateStr.length > 10) {
      dateStr = dateStr.slice(0, 10);
    }
    const createdAt = String(s.created_at || (s.payload as any)?.created_at || "");

    return {
      id: String(s.id || ""),
      urutan: Number(s.urutan || 0),
      invoice_no: invoiceNo,
      customer_name: String(s.customer_name || s.catatan || "Pendapatan jamu"),
      total: Number(s.total || 0),
      payment_method: String(s.payment_method || "Tunai"),
      notes: s.notes || s.catatan ? String(s.notes || s.catatan) : null,
      status: String(s.status === "valid" ? "Tercatat" : (s.status || "Tercatat")),
      jamu_terjual_ml: Number(s.jamu_terjual_ml !== undefined ? s.jamu_terjual_ml : ((s.payload as any)?.jamu_terjual_ml || 0)),
      restok_ml: Number(s.restok_ml !== undefined ? s.restok_ml : ((s.payload as any)?.restok_ml || 0)),
      created_at: createdAt || (dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString())
    };
  });

  sales.sort((a, b) => {
    const getTrxDate = (x: any) => {
      if (x.tanggal && /^\d{4}-\d{2}-\d{2}/.test(x.tanggal)) return x.tanggal.slice(0, 10);
      if (x.date && /^\d{4}-\d{2}-\d{2}/.test(x.date)) return x.date.slice(0, 10);
      const m = (x.invoice_no || "").match(/TRX-(\d{4})(\d{2})(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      return (x.created_at || "").slice(0, 10);
    };

    const da = getTrxDate(a);
    const db = getTrxDate(b);
    const dateDiff = db.localeCompare(da);
    if (dateDiff !== 0) return dateDiff;
    const ca = a.created_at || "";
    const cb = b.created_at || "";
    if (ca && cb) {
      const cDiff = cb.localeCompare(ca);
      if (cDiff !== 0) return cDiff;
    }
    return (b.urutan || 0) - (a.urutan || 0);
  });

  const stockEntries: any[] = (state.dailyStocks || state.stok_harian || state.stockEntries || []).map((s: Record<string, unknown>) => {
    const pId = String(s.produk_id || s.productId || "");
    const qty = Number(s.jumlah !== undefined ? s.jumlah : (s.qty !== undefined ? s.qty : s.stock) || 0);
    return {
      id: String(s.id || ""),
      urutan: Number(s.urutan || 0),
      produk_id: pId,
      productId: pId,
      tanggal: String(s.tanggal || s.date || "").slice(0, 10),
      date: String(s.date || s.tanggal || "").slice(0, 10),
      jumlah: qty,
      qty: qty,
      stock: qty,
      status: String(s.status || ""),
      payload: s.payload || {}
    };
  });

  const stockMutations: StockMutation[] = (state.stockMutations || state.mutasi_stok || state.moves || []).map((m: Record<string, unknown>) => {
    const pId = String(m.produk_id || m.productId || "");
    const dateStr = String(m.tanggal || m.date || "").slice(0, 10);
    const createdAt = String(m.created_at || (m.payload as any)?.created_at || (dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString()));
    const prev = Number(m.stok_sebelumnya !== undefined ? m.stok_sebelumnya : ((m.payload as any)?.stok_sebelumnya || 0));
    const nextStk = Number(m.stok_terbaru !== undefined ? m.stok_terbaru : ((m.payload as any)?.stok_terbaru || m.jumlah || m.qty || 0));
    const delta = Number(m.perubahan !== undefined ? m.perubahan : ((m.payload as any)?.perubahan !== undefined ? (m.payload as any).perubahan : (nextStk - prev)));

    return {
      id: String(m.id || ""),
      urutan: Number(m.urutan || 0),
      produk_id: pId,
      productId: pId,
      tanggal: dateStr,
      created_at: createdAt,
      stok_sebelumnya: prev,
      stok_terbaru: nextStk,
      perubahan: delta,
      jumlah: Math.abs(delta),
      jenis: String(m.jenis || "Stok Harian"),
      catatan: m.catatan || m.notes ? String(m.catatan || m.notes) : null,
      payload: m.payload || {}
    };
  });

  const aggregateStockHistory: AggregateStockHistory[] = (state.aggregateStockHistory || state.riwayat_stok || []).map((h: any) => ({
    id: h.id,
    tanggal: String(h.tanggal || "").slice(0, 10),
    waktu_update: h.waktu_update || h.created_at || `${h.tanggal}T12:00:00Z`,
    total_stok_sebelumnya: Number(h.total_stok_sebelumnya || 0),
    total_stok_terbaru: Number(h.total_stok_terbaru || 0),
    perubahan_stok: Number(h.perubahan_stok !== undefined ? h.perubahan_stok : (h.total_stok_terbaru - h.total_stok_sebelumnya)),
    jenis_perubahan: String(h.jenis_perubahan || ""),
    keterangan: String(h.keterangan || h.catatan || ""),
    batch_id: String(h.batch_id || "")
  }));

  stockMutations.sort((a, b) => {
    const ca = a.created_at || `${a.tanggal}T12:00:00Z`;
    const cb = b.created_at || `${b.tanggal}T12:00:00Z`;
    return cb.localeCompare(ca);
  });

  aggregateStockHistory.sort((a, b) => b.waktu_update.localeCompare(a.waktu_update));

  return { products, sales, stockMutations, stockEntries, aggregateStockHistory, revision: currentRevision, canEdit: true, rawState: state };
}

export async function fetchStore(): Promise<{
  products: Product[];
  sales: Sale[];
  stockMutations: StockMutation[];
  stockEntries: any[];
  aggregateStockHistory: AggregateStockHistory[];
  revision: number;
  canEdit: boolean;
}> {
  const res = await fetch("/api/store", {
    headers: { ...getAuthHeaders() },
    credentials: "same-origin"
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    isSupabaseConfigured = false;
    throw new Error(errData.error || `Gagal terhubung ke database server (HTTP ${res.status}).`);
  }

  const data = await res.json();
  canEditState = true;
  if (data.configured !== undefined) {
    isSupabaseConfigured = Boolean(data.configured);
  }
  const parsed = parseStateResponse(data.state, data.revision);
  return { 
    products: parsed.products, 
    sales: parsed.sales, 
    stockMutations: parsed.stockMutations, 
    stockEntries: parsed.stockEntries,
    aggregateStockHistory: parsed.aggregateStockHistory,
    revision: parsed.revision, 
    canEdit: true 
  };
}

export async function sendStoreAction(action: string, payload: unknown): Promise<{
  products: Product[];
  sales: Sale[];
  stockMutations: StockMutation[];
  stockEntries: any[];
  aggregateStockHistory: AggregateStockHistory[];
  revision: number;
  canEdit: boolean;
}> {
  const res = await fetch("/api/store", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    credentials: "same-origin",
    body: JSON.stringify({
      revision: currentRevision,
      action,
      payload
    })
  });

  if (res.status === 409) {
    throw new Error("Data telah diperbarui oleh sesi lain. Memuat ulang data terbaru…");
  }

  if (res.status === 503) {
    isSupabaseConfigured = false;
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Konfigurasi server database Supabase belum lengkap.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal menyimpan data ke database (HTTP ${res.status}).`);
  }

  const data = await res.json();
  canEditState = true;
  if (data.configured !== undefined) {
    isSupabaseConfigured = Boolean(data.configured);
  }
  const parsed = parseStateResponse(data.state, data.revision);
  return { 
    products: parsed.products, 
    sales: parsed.sales, 
    stockMutations: parsed.stockMutations, 
    stockEntries: parsed.stockEntries,
    revision: parsed.revision, 
    canEdit: true 
  };
}

export async function authenticateOwnerApi(_code: string): Promise<boolean> {
  return true;
}

export async function logoutOwnerApi(): Promise<void> {}

export async function getProducts(): Promise<Product[]> {
  const store = await fetchStore();
  return store.products;
}

export async function saveProduct(product: Partial<Product> & { name: string }) {
  const payload = {
    id: product.id,
    nama: product.name.trim(),
    name: product.name.trim(),
    kode: product.sku || product.code || "JH",
    code: product.sku || product.code || "JH",
    sku: product.sku || product.code || "JH",
    satuan: product.unit || "ml",
    unit: product.unit || "ml",
    harga: Number(product.sell_price || 0),
    buy_price: Number(product.buy_price || 0),
    sell_price: Number(product.sell_price || 0),
    stock: Number(product.stock || 0),
    min_stock: Number(product.min_stock || 200)
  };

  const res = await sendStoreAction("product", payload);
  return res.products.find(p => p.id === product.id || p.sku === payload.sku) || product as Product;
}

export async function deleteProduct(id: string) {
  await sendStoreAction("variants", { id, aktif: false, active: false });
}

export async function getSales(): Promise<Sale[]> {
  const store = await fetchStore();
  return store.sales;
}

export async function createSale(input: {
  id?: string;
  customer_name?: string;
  payment_method?: string;
  notes?: string;
  total?: number;
  date?: string;
  tanggal?: string;
  status?: string;
  jamu_terjual_ml?: number;
  restok_ml?: number;
  items?: { product_id: string; qty: number; unit_price: number }[];
}) {
  const total = input.total !== undefined
    ? Number(input.total)
    : (input.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);

  const now = new Date();
  const dateStr = (input.tanggal || input.date || now.toISOString().slice(0, 10)).slice(0, 10);
  const randomPart = Math.random().toString(16).substring(2, 8).toUpperCase();
  const datePart = dateStr.replace(/-/g, "");
  const invoiceNo = `TRX-${datePart}-${randomPart}`;

  await sendStoreAction("income", {
    id: input.id,
    nomor: invoiceNo,
    invoice_no: invoiceNo,
    tanggal: dateStr,
    date: dateStr,
    total,
    status: input.status || "Tercatat",
    customer_name: input.customer_name || input.notes || "Pendapatan jamu",
    payment_method: input.payment_method || "Tunai",
    notes: input.notes || input.customer_name || "Pendapatan transaksi jamu",
    jamu_terjual_ml: Math.max(0, Number(input.jamu_terjual_ml || 0)),
    restok_ml: Math.max(0, Number(input.restok_ml || 0)),
    items: input.items || []
  });

  return invoiceNo;
}

export async function recordStocktake(
  items: Record<string, number>,
  date?: string,
  statuses?: Record<string, string>
) {
  return sendStoreAction("stocktake", {
    tanggal: date || new Date().toISOString().slice(0, 10),
    items,
    statuses
  });
}

export async function getSaleItems(_saleId: string): Promise<SaleItem[]> {
  return [];
}
