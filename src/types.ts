export type Product = {
  id: string;
  name: string;
  sku: string | null;
  code?: string;
  category: string | null;
  unit: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  status?: string;
  last_updated?: string;
  created_at?: string;
  active?: boolean;
  aktif?: boolean;
};

export type Sale = {
  id: string;
  invoice_no: string;
  customer_name: string | null;
  total: number;
  payment_method: string;
  notes: string | null;
  status?: string;
  created_at: string;
  jamu_terjual_ml?: number;
  restok_ml?: number;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
};

export type ViewName = "dashboard" | "sales" | "inventory" | "history" | "reports" | "settings";

export type StockMutation = {
  id: string;
  urutan?: number;
  produk_id: string;
  productId?: string;
  tanggal: string;
  created_at: string;
  stok_sebelumnya: number;
  stok_terbaru: number;
  perubahan: number;
  jumlah: number;
  jenis: string;
  catatan?: string | null;
  payload?: any;
};
export type AggregateStockHistory = {
  id: string;
  tanggal: string;
  waktu_update: string;
  total_stok_sebelumnya: number;
  total_stok_terbaru: number;
  perubahan_stok: number;
  jenis_perubahan: string;
  keterangan: string;
  batch_id?: string;
};
