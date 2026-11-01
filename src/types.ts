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

