import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, BarChart3, Calendar, Check, ClipboardList,
  Download, FileText, LayoutDashboard, Menu,
  Package, Plus, RefreshCw, RotateCcw, Search, Settings, ShoppingCart,
  Sprout, Trash2, TrendingUp, X
} from "lucide-react";
import {
  createSale, deleteProduct, demoProducts, demoSales,
  getProducts, getSales, saveProduct, fetchStore,
  recordStocktake, isSupabaseConfigured
} from "./lib/data";
import type { Product, Sale, ViewName, StockMutation, AggregateStockHistory } from "./types";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n || 0);

const parseRupiah = (val: string): number => {
  if (!val) return 0;
  // Hapus "Rp", titik (pemisah ribuan), spasi, dan koma desimal jika ada
  const clean = val.replace(/Rp|[\s.]/g, "").replace(/,/g, ".");
  return Math.floor(Number(clean)) || 0;
};

const formatRupiahInput = (val: string) => {
  const num = parseRupiah(val);
  if (num === 0 && val !== "0") return "";
  return num.toLocaleString("id-ID");
};

const formatIndonesianDate = (d: Date = new Date()) => {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(d);
  } catch {
    return d.toLocaleDateString("id-ID");
  }
};

export function getJakartaDateParts(d: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  isoDate: string;
  monthIso: string;
  monthNameLong: string;
  monthNameShort: string;
  lastDayNum: number;
  monthRangeLabelShort: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const formatted = formatter.format(d);
  const [yearStr, monthStr, dayStr] = formatted.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const isoDate = `${yearStr}-${monthStr}-${dayStr}`;
  const monthIso = `${yearStr}-${monthStr}`;

  const shortMap = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const longMap = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const monthNameShort = shortMap[month - 1] || "";
  const monthNameLong = longMap[month - 1] || "";

  const lastDayNum = new Date(year, month, 0).getDate();
  const monthRangeLabelShort = `1 ${monthNameShort} ${year} - ${lastDayNum} ${monthNameShort} ${year}`;

  return {
    year,
    month,
    day,
    isoDate,
    monthIso,
    monthNameLong,
    monthNameShort,
    lastDayNum,
    monthRangeLabelShort
  };
}

export function getJakartaTodayIso(d: Date = new Date()): string {
  return getJakartaDateParts(d).isoDate;
}

export function getJakartaYesterdayIso(d: Date = new Date()): string {
  const { year, month, day } = getJakartaDateParts(d);
  const yDate = new Date(Date.UTC(year, month - 1, day - 1));
  const yYear = yDate.getUTCFullYear();
  const yMonth = String(yDate.getUTCMonth() + 1).padStart(2, "0");
  const yDay = String(yDate.getUTCDate()).padStart(2, "0");
  return `${yYear}-${yMonth}-${yDay}`;
}

const getTodayIsoDate = () => getJakartaTodayIso();

function getSaleDate(s: Sale): string {
  if ((s as any).tanggal && /^\d{4}-\d{2}-\d{2}/.test((s as any).tanggal)) {
    return (s as any).tanggal.slice(0, 10);
  }
  if ((s as any).date && /^\d{4}-\d{2}-\d{2}/.test((s as any).date)) {
    return (s as any).date.slice(0, 10);
  }
  const match = (s.invoice_no || "").match(/TRX-(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const raw = s.created_at || "";
  if (raw && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  try {
    const d = new Date(s.created_at);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    // ignore
  }
  return "";
}

const PRODUCT_ORDER = [
  "H",
  "KS",
  "SS",
  "SP",
  "M",
  "K",
  "O",
  "P",
  "B",
  "HJ",
  "PB",
  "PLS",
  "DRT",
  "KCM"
];

function sortProductsByOrder(prods: Product[]): Product[] {
  return [...prods].sort((a, b) => {
    const getCode = (p: Product) => {
      const code = (p.sku || p.code || p.kode || p.name || "").trim().toUpperCase();
      if (code === "MADU LANANG" || code.includes("MADU")) return "ML";
      return code;
    };
    const codeA = getCode(a);
    const codeB = getCode(b);
    let idxA = PRODUCT_ORDER.indexOf(codeA);
    let idxB = PRODUCT_ORDER.indexOf(codeB);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return (a.urutan || 0) - (b.urutan || 0);
  });
}

const nav: { id: ViewName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "inventory", label: "Barang & stok", icon: Package },
  { id: "history", label: "Riwayat transaksi", icon: ClipboardList },
  { id: "reports", label: "Laporan", icon: BarChart3 }
];

export default function App() {
  const [view, setView] = useState<ViewName>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [showAddSale, setShowAddSale] = useState(false);

  // Modals
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    category: "Jamu Cair",
    unit: "ml",
    buy_price: "5000",
    sell_price: "8000",
    stock: "10",
    min_stock: "3"
  });

  // Quick single stock editing
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockVal, setQuickStockVal] = useState<number>(0);
  const [quickStockDate, setQuickStockDate] = useState<string>(getTodayIsoDate);
  const [quickStockHasExisting, setQuickStockHasExisting] = useState<boolean>(false);

  // Inventory date filter state
  const [inventoryDateMode, setInventoryDateMode] = useState<"today" | "yesterday" | "custom">("today");
  const [inventoryCustomDate, setInventoryCustomDate] = useState<string>(getTodayIsoDate);

  // Daily batch stock editing
  const [showDailyStockModal, setShowDailyStockModal] = useState(false);
  const [dailyStockDraft, setDailyStockDraft] = useState<Record<string, number | "">>({});
  const [dailyStatusDraft, setDailyStatusDraft] = useState<Record<string, string>>({});
  const [dailyStockDate, setDailyStockDate] = useState<string>(getTodayIsoDate);

  // Live actual date for header
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const handleFocus = () => setCurrentDate(new Date());
    window.addEventListener("focus", handleFocus);
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 30000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(timer);
    };
  }, []);

  const formattedHeaderDate = useMemo(() => {
    return formatIndonesianDate(currentDate);
  }, [currentDate]);

  // Transaction detail & edit modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dailyStocks, setDailyStocks] = useState<any[]>([]);

  // Cart & POS
  const [cart, setCart] = useState<{ product_id: string; qty: number; unit_price: number }[]>([]);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("Tunai");
  const [saleNotes, setSaleNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [stockMutations, setStockMutations] = useState<StockMutation[]>([]);
  const [aggregateStockHistory, setAggregateStockHistory] = useState<AggregateStockHistory[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const store = await fetchStore();
      setProducts(sortProductsByOrder(store.products));
      setSales(store.sales);
      if (store.stockMutations) {
        setStockMutations(store.stockMutations);
      }
      if (store.stockEntries) {
        setDailyStocks(store.stockEntries);
      }
      if (store.aggregateStockHistory) {
        setAggregateStockHistory(store.aggregateStockHistory);
      }

      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Data gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Calculations
  const { monthIso, isoDate: todayIso } = useMemo(() => getJakartaDateParts(currentDate), [currentDate]);
  const yesterdayIso = useMemo(() => getJakartaYesterdayIso(currentDate), [currentDate]);

  const activeInventoryDate = useMemo(() => {
    if (inventoryDateMode === "today") return todayIso;
    if (inventoryDateMode === "yesterday") return yesterdayIso;
    return inventoryCustomDate || todayIso;
  }, [inventoryDateMode, todayIso, yesterdayIso, inventoryCustomDate]);

  const totalMonthRevenue = useMemo(() => {
    const monthSales = sales.filter(s => {
      if (s.status === "Dibatalkan" || s.status === "Batal") return false;
      return getSaleDate(s).startsWith(monthIso);
    });
    return monthSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  }, [sales, monthIso]);

  const yesterdayRevenue = useMemo(() => {
    const yesterdayIso = getJakartaYesterdayIso(currentDate);
    const yesterdaySales = sales.filter(s => {
      if (s.status === "Dibatalkan" || s.status === "Batal") return false;
      return getSaleDate(s) === yesterdayIso;
    });
    return yesterdaySales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  }, [sales, currentDate]);

  const todayRevenue = useMemo(() => {
    const todaySales = sales.filter(s => {
      if (s.status === "Dibatalkan" || s.status === "Batal") return false;
      return getSaleDate(s) === todayIso;
    });
    return todaySales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  }, [sales, todayIso]);

  const totalStockAll = useMemo(() => {
    return products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
  }, [products]);

  const lowStock = products.filter(p => p.stock < 1000);
  const filteredProducts = sortProductsByOrder(
    products.filter(p =>
      `${p.name} ${p.sku ?? ""} ${p.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
    )
  );
  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      const da = getSaleDate(a);
      const db = getSaleDate(b);
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
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sortedSales.filter(s => {
      const matchSearch = `${s.invoice_no} ${s.customer_name ?? ""} ${s.notes ?? ""}`.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (historyDateFilter) {
        return getSaleDate(s) === historyDateFilter;
      }
      return true;
    });
  }, [sortedSales, search, historyDateFilter]);
  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductDraft({
      name: "",
      sku: "",
      category: "Jamu Cair",
      unit: "ml",
      buy_price: "5000",
      sell_price: "8000",
      stock: "1000",
      min_stock: "200"
    });
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductDraft({
      name: p.name,
      sku: p.sku ?? "",
      category: p.category ?? "Jamu Cair",
      unit: p.unit,
      buy_price: String(p.buy_price),
      sell_price: String(p.sell_price),
      stock: String(p.stock),
      min_stock: String(p.min_stock)
    });
    setShowProductForm(true);
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveProduct({
        ...(editingProduct ? { id: editingProduct.id } : {}),
        ...productDraft,
        buy_price: Number(productDraft.buy_price),
        sell_price: Number(productDraft.sell_price),
        stock: Number(productDraft.stock),
        min_stock: Number(productDraft.min_stock)
      });
      setShowProductForm(false);
      setNotice("Barang berhasil disimpan.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barang gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (p: Product) => {
    if (!window.confirm(`Hapus barang "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      setNotice("Barang berhasil dihapus.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barang gagal dihapus.");
    }
  };

  // Quick single stock editing opener
  const handleOpenEditStockForDate = (product: Product, targetDate: string, currentQty: number | null) => {
    setQuickStockProduct(product);
    setQuickStockVal(currentQty !== null ? currentQty : 0);
    setQuickStockDate(targetDate);
    setQuickStockHasExisting(currentQty !== null);
  };

  // Quick single stock edit save
  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const val = Math.max(0, quickStockVal);
      await recordStocktake({ [quickStockProduct.id]: val }, quickStockDate);
      setNotice(`Stok ${quickStockProduct.sku || quickStockProduct.name} untuk tanggal ${quickStockDate} berhasil disimpan (${val.toLocaleString("id-ID")} ${quickStockProduct.unit}).`);
      setQuickStockProduct(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui stok.");
    } finally {
      setSaving(false);
    }
  };

  // Open daily batch stock update (pre-fills with existing data for the chosen date if any)
  const handleOpenDailyStock = (targetDate?: string) => {
    const chosenDate = targetDate || activeInventoryDate || getTodayIsoDate();
    const draft: Record<string, number | ""> = {};
    const statusDraft: Record<string, string> = {};
    
    products.forEach(p => {
      const entry = dailyStocks.find(s => (s.produk_id === p.id || s.productId === p.id || s.produk_id === p.sku || s.productId === p.sku) && (s.tanggal === chosenDate || s.date === chosenDate));
      if (entry) {
        const qty = Number(entry.jumlah !== undefined ? entry.jumlah : (entry.qty !== undefined ? entry.qty : entry.stock) || 0);
        draft[p.id] = qty;
        statusDraft[p.id] = qty < 1000 ? "Stok menipis" : "Stok aman";
      } else {
        draft[p.id] = "";
        statusDraft[p.id] = "Stok aman";
      }
    });
    setDailyStockDraft(draft);
    setDailyStatusDraft(statusDraft);
    setDailyStockDate(chosenDate);
    setShowDailyStockModal(true);
  };

  const handleToggleAddSale = () => {
    setShowAddSale(v => !v);
  };

  // Save daily batch stock update
  const handleSaveDailyStock = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const itemsToSave: Record<string, number> = {};
      Object.entries(dailyStockDraft).forEach(([pid, val]) => {
        if (val !== "" && val !== undefined) {
          itemsToSave[pid] = Number(val);
        }
      });
      await recordStocktake(itemsToSave, dailyStockDate, dailyStatusDraft);
      setShowDailyStockModal(false);
      setNotice(`Stok dagangan untuk tanggal ${dailyStockDate} berhasil diperbarui dan tersimpan di database.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui stok harian.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetup14Variants = async () => {
    const standardVariants = [
      { id: "prod-1793547155241", sku: "H", name: "Asam Urat Khusus Diabetes", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 3000, min_stock: 2000 },
      { id: "prod-1793547155456", sku: "KS", name: "Kesemutan", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 2000 },
      { id: "prod-1793547155627", sku: "SS", name: "Sesak Nafas", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 2000 },
      { id: "prod-1793547155763", sku: "SP", name: "Spesial", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 2000 },
      { id: "prod-1793547155912", sku: "M", name: "Nyeri / Sakit Kepala", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156043", sku: "K", name: "Kolesterol", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156183", sku: "O", name: "Sakit Pinggang", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156298", sku: "P", name: "Asam Urat", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156431", sku: "B", name: "Pegelinu", unit: "ml", buy_price: 5000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156547", sku: "HJ", name: "Flu Batuk", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156679", sku: "PB", name: "Lambung", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156814", sku: "PLS", name: "Pelangsing", unit: "ml", buy_price: 6000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547156935", sku: "DRT", name: "Darah Tinggi", unit: "ml", buy_price: 7000, sell_price: 10000, stock: 0, min_stock: 1000 },
      { id: "prod-1793547157054", sku: "KCM", name: "Kencing Manis", unit: "ml", buy_price: 7000, sell_price: 10000, stock: 0, min_stock: 1000 }
    ];

    setSaving(true);
    try {
      let created = 0;
      for (const v of standardVariants) {
        const found = products.find(p => (p.sku || p.code) === v.sku);
        if (!found) {
          await saveProduct(v);
          created++;
        }
      }
      await refresh();
      setNotice(
        created > 0
          ? `${created} varian jamu berhasil ditambahkan. 14 varian jamu herbal lengkap.`
          : "14 varian jamu herbal sudah lengkap dan siap di sistem."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyiapkan varian jamu.");
    } finally {
      setSaving(false);
    }
  };

  const addToCart = (p: Product) => {
    if (p.stock < 1) {
      setError("Stok barang kosong.");
      return;
    }
    setCart(old => {
      const found = old.find(x => x.product_id === p.id);
      if (found) {
        return old.map(x =>
          x.product_id === p.id ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x
        );
      }
      return [...old, { product_id: p.id, qty: 1, unit_price: p.sell_price }];
    });
  };

  const submitSale = async () => {
    if (!cart.length) {
      setError("Tambahkan barang ke transaksi terlebih dahulu.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createSale({
        customer_name: customer,
        payment_method: payment,
        notes: saleNotes,
        items: cart
      });
      setCart([]);
      setCustomer("");
      setSaleNotes("");
      setNotice("Transaksi penjualan berhasil dicatat ke database.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaksi gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows =
      view === "inventory"
        ? [
            ["Kode", "Nama", "Kategori", "Satuan", "Harga beli", "Harga jual", "Stok", "Stok minimum"],
            ...products.map(p => [
              p.sku ?? "",
              p.name,
              p.category ?? "",
              p.unit,
              p.buy_price,
              p.sell_price,
              p.stock,
              p.min_stock
            ])
          ]
        : [
            ["Invoice", "Tanggal", "Keterangan/Pelanggan", "Pembayaran", "Jamu Terjual (ml)", "Restok (ml)", "Status", "Total"],
            ...sales.map(s => [
              s.invoice_no,
              s.created_at,
              s.customer_name ?? "",
              s.payment_method,
              s.jamu_terjual_ml ?? 0,
              s.restok_ml ?? 0,
              s.status ?? "Tercatat",
              s.total
            ])
          ];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jamu-herbal-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const title = nav.find(n => n.id === view)?.label ?? (view === "settings" ? "Pengaturan & cadangan" : "Ringkasan");

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sprout size={22} />
          </div>
          <div>
            <strong>Jamu Herbal Gambirono</strong>
            <span>RUANG USAHA ANDA</span>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-label">KELOLA TOKO</div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                onClick={() => {
                  setView(item.id);
                  setMobileNav(false);
                  setSearch("");
                  setHistoryDateFilter("");
                  setError("");
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.id === "inventory" && lowStock.length > 0 && (
                  <b className="nav-count">{lowStock.length}</b>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-brand-status">
            <div className={`connection-dot ${isSupabaseConfigured ? "connected" : ""}`} />
            <div>
              <strong>Jamu Herbal Gambirono</strong>
              <small>Data bersama: penyimpanan online.</small>
            </div>
          </div>
          <button
            className="sidebar-settings-btn"
            onClick={() => {
              setView("settings");
              setMobileNav(false);
            }}
          >
            <Settings size={15} />
            <span>Pengaturan & cadangan</span>
          </button>
        </div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)} />}

      {/* Main Column */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>TOKO PRIBADI</span>
              <span className="crumb-slash">/</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-date">{formattedHeaderDate}</span>
            <button
              className="icon-btn"
              onClick={() => void refresh()}
              aria-label="Muat ulang data"
              title="Muat ulang data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </header>

        {/* Content Section */}
        <section className="page">
          {view === "dashboard" ? (
            /* Ringkasan Header (Matches image_ef8e1140.png) */
            <div className="page-heading">
              <div>
                <p className="eyebrow">CATATAN USAHA</p>
                <h1>Ringkasan toko</h1>
                <p className="subtitle">Semua aktivitas toko Anda, dalam satu tempat.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleToggleAddSale}
              >
                <Plus size={16} /> Catat penjualan
              </button>
            </div>
          ) : view === "history" ? (
            /* Riwayat Transaksi Header (Matches image_bdb14e95.png) */
            <div className="page-heading">
              <div>
                <p className="eyebrow">CATATAN USAHA</p>
                <h1>Riwayat transaksi</h1>
                <p className="subtitle">Telusuri penjualan dan lihat detail setiap transaksi.</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={exportCsv}
                  title="Ekspor CSV"
                >
                  <Download size={15} /> Ekspor CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleToggleAddSale}
                >
                  <Plus size={16} /> Catat penjualan
                </button>
              </div>
            </div>
          ) : view === "inventory" ? (
            /* Barang & Stok Header (Matches image_9f7f6ac4.png) */
            <div className="page-heading">
              <div>
                <p className="eyebrow">CATATAN USAHA</p>
                <h1>Stok jamu herbal</h1>
                <p className="subtitle">
                  Catat jumlah stok fisik jamu yang tersedia dalam mililiter (ml). Rekonsiliasi stok akan membandingkan sisa fisik dengan volume penjualan.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleOpenDailyStock(activeInventoryDate)}
              >
                Isi stok harian
              </button>
            </div>
          ) : view === "reports" ? (
            /* Laporan Header (Matches image_6ae483cc.png) */
            <div className="page-heading">
              <div>
                <p className="eyebrow">CATATAN USAHA</p>
                <h1>Laporan toko</h1>
                <p className="subtitle">
                  Rekap transaksi dan pergerakan stok pada periode pilihan Anda.
                </p>
              </div>
              <button
                type="button"
                className="report-print-btn"
                onClick={() => window.print()}
              >
                <ArrowUpRight size={14} /> Cetak laporan
              </button>
            </div>
          ) : (
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  ASIA/JAKARTA · {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date()).toUpperCase()}
                </p>
                <h1>{title}</h1>
                <p className="subtitle">{pageDescription(view)}</p>
              </div>
            </div>
          )}

          {/* Form Catat Penjualan (Tampil di menu Ringkasan & Riwayat Transaksi saat dibuka) */}
          {showAddSale && (view === "dashboard" || view === "history" || view === "sales") && (
            <div className="catat-penjualan-container">
              <CatatPenjualanForm
                onSuccess={msg => {
                  setNotice(msg);
                  setShowAddSale(false);
                  void refresh();
                }}
                onCancel={() => setShowAddSale(false)}
              />
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Tutup">
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert alert-success">
              <Check size={17} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Tutup">
                <X size={15} />
              </button>
            </div>
          )}
          {loading && (
            <div className="loading-line">
              <span /> Memuat data terbaru…
            </div>
          )}

          {error && !loaded ? (
            <div className="empty-state" style={{ padding: "80px 20px", textAlign: "center" }}>
              <div style={{ color: "#b91c1c", marginBottom: 16 }}>
                <AlertTriangle size={48} style={{ margin: "0 auto" }} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f3323", marginBottom: 8 }}>Gagal memuat data</h2>
              <p style={{ color: "#627564", maxWidth: 400, margin: "0 auto 24px" }}>
                Terjadi kendala saat menghubungi server database. {error}
              </p>
              <button className="btn btn-primary" onClick={() => void refresh()}>
                <RefreshCw size={15} /> Coba lagi
              </button>
            </div>
          ) : (
            <>
              {/* VIEW: DASHBOARD (RINGKASAN) */}
              {view === "dashboard" && (
                <DashboardView
                  products={products}
                  sales={sales}
                  totalMonthRevenue={totalMonthRevenue}
                  yesterdayRevenue={yesterdayRevenue}
                  todayRevenue={todayRevenue}
                  currentDate={currentDate}
                  onNavigate={setView}
                  onOpenCatatPenjualan={handleToggleAddSale}
                  onQuickEditStock={p => {
                    setQuickStockProduct(p);
                    setQuickStockVal(p.stock);
                  }}
                  onOpenDailyStock={handleOpenDailyStock}
                  onViewSaleDetail={setSelectedSale}
                />
              )}

              {/* VIEW: INVENTORY */}
              {view === "inventory" && (
                <InventoryView
                  products={products}
                  dailyStocks={dailyStocks}
                  aggregateHistory={aggregateStockHistory}
                  currentDate={currentDate}
                  filterMode={inventoryDateMode}
                  setFilterMode={setInventoryDateMode}
                  customDate={inventoryCustomDate}
                  setCustomDate={setInventoryCustomDate}
                  selectedDate={activeInventoryDate}
                  onAddVariant={openNewProduct}
                  onEditProductMaster={openEditProduct}
                  onEditStock={handleOpenEditStockForDate}
                  onOpenBatchStock={handleOpenDailyStock}
                />
              )}

              {/* VIEW: SALES FALLBACK */}
              {view === "sales" && !showAddSale && (
                <div className="catat-penjualan-container">
                  <CatatPenjualanForm
                    onSuccess={msg => {
                      setNotice(msg);
                      setView("history");
                      void refresh();
                    }}
                    onCancel={() => setView("dashboard")}
                  />
                </div>
              )}

              {/* VIEW: HISTORY */}
              {view === "history" && (
                <HistoryView
                  sales={filteredSales}
                  search={search}
                  setSearch={setSearch}
                  filterDate={historyDateFilter}
                  setFilterDate={setHistoryDateFilter}
                  onViewDetail={setSelectedSale}
                />
              )}

              {/* VIEW: REPORTS */}
              {view === "reports" && (
                <ReportsView
                  sales={sales}
                  dailyStocks={dailyStocks}
                  products={products}
                  onExport={exportCsv}
                  onViewDetail={setSelectedSale}
                />
              )}

              {/* VIEW: SETTINGS */}
              {view === "settings" && (
                <SettingsPageView
                  onExport={exportCsv}
                  products={products}
                  sales={sales}
                  configured={isSupabaseConfigured}
                />
              )}
            </>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <span>
            <Sprout size={14} /> Jamu Herbal Gambirono
          </span>
          <span>Kelola usaha dengan lebih teratur</span>
        </footer>
      </main>

      {/* MODAL: Quick Stock Edit for Single Item */}
      {quickStockProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setQuickStockProduct(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>{quickStockHasExisting ? "Edit Stok:" : "Input Stok Baru:"} {quickStockProduct.sku || quickStockProduct.name}</h2>
                <p>{quickStockProduct.name} · Satuan: {quickStockProduct.unit}</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setQuickStockProduct(null)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: "14px 0 20px" }}>
              {/* Date Indicator Banner */}
              <div style={{
                background: "#f3f8f3",
                border: "1px solid #dbe8dc",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#4f6052", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Tanggal Pencatatan
                  </span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1f3323", marginTop: 2 }}>
                    {formatIndonesianDate(new Date(quickStockDate + "T12:00:00Z"))}
                  </div>
                </div>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: "11px",
                  fontWeight: 800,
                  background: quickStockDate === todayIso ? "#dcfce7" : (quickStockDate === yesterdayIso ? "#e0f2fe" : "#f1f5f9"),
                  color: quickStockDate === todayIso ? "#166534" : (quickStockDate === yesterdayIso ? "#0369a1" : "#475569")
                }}>
                  {quickStockDate === todayIso ? "Hari Ini" : quickStockDate === yesterdayIso ? "Kemarin" : quickStockDate}
                </span>
              </div>

              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4f6052", marginBottom: 8 }}>
                Jumlah Sisa Stok Fisik (ml)
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 44, height: 44, fontSize: 13, fontWeight: 700, padding: 0 }}
                  onClick={() => setQuickStockVal(v => Math.max(0, v - 100))}
                  title="Kurangi 100 ml"
                >
                  −100
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 40, height: 44, fontSize: 18, padding: 0 }}
                  onClick={() => setQuickStockVal(v => Math.max(0, v - 1))}
                  title="Kurangi 1 ml"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={quickStockVal}
                  onChange={e => setQuickStockVal(Math.max(0, Number(e.target.value)))}
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 22,
                    fontWeight: 800,
                    textAlign: "center",
                    border: quickStockVal < 1000 ? "1px solid #fca5a5" : "1px solid #86efac",
                    background: quickStockVal < 1000 ? "#fff1f2" : "#f0fdf4",
                    color: quickStockVal < 1000 ? "#b91c1c" : "#15803d",
                    borderRadius: 8
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 40, height: 44, fontSize: 18, padding: 0 }}
                  onClick={() => setQuickStockVal(v => v + 1)}
                  title="Tambah 1 ml"
                >
                  +
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 44, height: 44, fontSize: 13, fontWeight: 700, padding: 0 }}
                  onClick={() => setQuickStockVal(v => v + 100)}
                  title="Tambah 100 ml"
                >
                  +100
                </button>
              </div>

              {/* Status preview based on 1000ml global rule */}
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#627564" }}>
                  Status otomatis stok:
                </span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: quickStockVal < 1000 ? "#fff1f2" : "#f0fdf4",
                  border: quickStockVal < 1000 ? "1px solid #fecaca" : "1px solid #dcfce7",
                  color: quickStockVal < 1000 ? "#b91c1c" : "#15803d"
                }}>
                  {quickStockVal < 1000 ? "Stok menipis (< 1.000 ml)" : "Stok aman (≥ 1.000 ml)"}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQuickStockProduct(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveQuickStock}
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan Stok"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Daily Batch Stock Input ("Isi stok harian") (Matches image_c7cf5b1d.png) */}
      {showDailyStockModal && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowDailyStockModal(false);
          }}
        >
          <div className="daily-stock-modal">
            <div className="daily-stock-header">
              <h2>Isi stok harian</h2>
              <button
                className="icon-btn"
                onClick={() => setShowDailyStockModal(false)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>

            <div className="daily-stock-body">
              <div className="field-group" style={{ marginBottom: 14 }}>
                <label className="field-label">Tanggal pencatatan</label>
                <input
                  type="date"
                  className="field-input"
                  value={dailyStockDate}
                  onChange={e => setDailyStockDate(e.target.value)}
                />
              </div>

              <p className="daily-stock-instruction">
                Isi sisa stok fisik aktual setiap varian dalam mililiter (ml). Kosongkan untuk melewati varian; masukkan 0 jika habis.
              </p>

              <div className="daily-stock-grid">
                {sortProductsByOrder(products).map(p => {
                  const label = `${p.sku || p.code || p.name} (${p.unit})`;
                  const currentVal = dailyStockDraft[p.id];
                  const currentStatus =
                    dailyStatusDraft[p.id] ||
                    (currentVal !== undefined && Number(currentVal) < 1000
                      ? "Stok menipis"
                      : "Stok aman");

                  return (
                    <div key={p.id} className="daily-stock-item">
                      <label className="daily-stock-item-label">{label}</label>
                      <input
                        type="number"
                        min="0"
                        className="daily-stock-item-input"
                        placeholder="Jumlah stok tersedia"
                        value={currentVal !== undefined ? currentVal : ""}
                        onChange={e => {
                          const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                          setDailyStockDraft(prev => ({ ...prev, [p.id]: val }));
                          // Automatically update status draft when value changes
                          setDailyStatusDraft(prev => ({ ...prev, [p.id]: (val !== "" && Number(val) < 1000) ? "Stok menipis" : "Stok aman" }));
                        }}
                      />
                      <label className="daily-stock-status-label">Status stok</label>
                      <select
                        className="daily-stock-select"
                        value={currentStatus}
                        onChange={e => {
                          const val = e.target.value;
                          setDailyStatusDraft(prev => ({ ...prev, [p.id]: val }));
                        }}
                      >
                        <option value="Stok aman">Stok aman</option>
                        <option value="Stok menipis">Stok menipis</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="daily-stock-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDailyStockModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveDailyStock}
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan stok harian"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detail Transaksi */}
      {selectedSale && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedSale(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <p className="eyebrow">RINCIAN TRANSAKSI</p>
                <h2>{selectedSale.invoice_no}</h2>
                <p>{new Date(selectedSale.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSelectedSale(null)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ background: "#f8faf7", border: "1px solid #e7eee5", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Keterangan / Pelanggan</span>
                <strong>{selectedSale.customer_name || "Pendapatan jamu"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Metode Pembayaran</span>
                <span className="trx-status-pill">{selectedSale.payment_method}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Status Transaksi</span>
                <span className="trx-status-pill">{selectedSale.status || "Tercatat"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Jamu Terjual (ml)</span>
                <strong>{(selectedSale.jamu_terjual_ml || 0).toLocaleString("id-ID")} ml</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Restok / Kulakan (ml)</span>
                <strong>{(selectedSale.restok_ml || 0).toLocaleString("id-ID")} ml</strong>
              </div>
              {selectedSale.notes && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "12px" }}>
                  <span style={{ color: "#7a887b" }}>Catatan</span>
                  <span>{selectedSale.notes}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid #e1e9df" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#253628" }}>Total Transaksi</span>
                <strong style={{ fontSize: "18px", color: "#255333" }}>{money(selectedSale.total)}</strong>
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedSale.status !== "Dibatalkan" && selectedSale.status !== "Batal" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const saleToEdit = selectedSale;
                        setSelectedSale(null);
                        setEditingSale(saleToEdit);
                        setShowAddSale(true);
                      }}
                    >
                      Ubah Transaksi
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
                      onClick={async () => {
                        if (window.confirm(`Batalkan transaksi ${selectedSale.invoice_no}?`)) {
                          try {
                            await createSale({
                              ...selectedSale,
                              date: getSaleDate(selectedSale),
                              status: "Dibatalkan"
                            });
                            setSelectedSale(null);
                            setNotice(`Transaksi ${selectedSale.invoice_no} dibatalkan.`);
                            await refresh();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Gagal membatalkan transaksi.");
                          }
                        }
                      }}
                    >
                      Batalkan Transaksi
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedSale(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Product Create / Edit Form */}
      {showProductForm && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowProductForm(false);
          }}
        >
          <form className="modal" onSubmit={submitProduct}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">INVENTARIS</span>
                <h2>{editingProduct ? "Edit Barang" : "Tambah Barang Baru"}</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowProductForm(false)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>
            <div className="form-grid">
              <label className="span-2">
                Nama barang
                <input
                  required
                  value={productDraft.name}
                  onChange={e => setProductDraft({ ...productDraft, name: e.target.value })}
                  placeholder="Contoh: Beras Kencur"
                />
              </label>
              <label>
                Kode / Inisial (SKU)
                <input
                  value={productDraft.sku}
                  onChange={e => setProductDraft({ ...productDraft, sku: e.target.value })}
                  placeholder="Contoh: B, KS, H"
                />
              </label>
              <label>
                Kategori
                <select
                  value={productDraft.category}
                  onChange={e => setProductDraft({ ...productDraft, category: e.target.value })}
                >
                  <option>Jamu Cair</option>
                  <option>Herbal</option>
                  <option>Bubuk</option>
                  <option>Lainnya</option>
                </select>
              </label>
              <label>
                Satuan
                <input
                  value={productDraft.unit}
                  onChange={e => setProductDraft({ ...productDraft, unit: e.target.value })}
                  required
                />
              </label>
              <label>
                Stok awal
                <input
                  type="number"
                  min="0"
                  value={productDraft.stock}
                  onChange={e => setProductDraft({ ...productDraft, stock: e.target.value })}
                  required
                />
              </label>
              <label>
                Harga beli (Rp)
                <input
                  type="number"
                  min="0"
                  value={productDraft.buy_price}
                  onChange={e => setProductDraft({ ...productDraft, buy_price: e.target.value })}
                  required
                />
              </label>
              <label>
                Harga jual (Rp)
                <input
                  type="number"
                  min="0"
                  value={productDraft.sell_price}
                  onChange={e => setProductDraft({ ...productDraft, sell_price: e.target.value })}
                  required
                />
              </label>
              <label className="span-2">
                Batas minimum stok aman
                <input
                  type="number"
                  min="0"
                  value={productDraft.min_stock}
                  onChange={e => setProductDraft({ ...productDraft, min_stock: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowProductForm(false)}
              >
                Batal
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Barang"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

function pageDescription(view: ViewName) {
  return ({
    sales: "Catat penjualan baru dan perbarui stok secara otomatis.",
    inventory: "Kelola daftar barang, harga, dan jumlah stok.",
    history: "Temukan kembali transaksi yang pernah dicatat.",
    reports: "Lihat ringkasan usaha dan ekspor data untuk pembukuan.",
    settings: "Status integrasi, ekspor data, dan petunjuk konfigurasi.",
    dashboard: ""
  })[view];
}

/* =========================================================================
   CATAT PENJUALAN FORM (Matches image_5b72f1ca.png)
   ========================================================================= */

function CatatPenjualanForm({
  editingSale,
  onSuccess,
  onCancel
}: {
  editingSale?: Sale | null;
  onSuccess: (msg: string) => void;
  onCancel?: () => void;
}) {
  const [tanggal, setTanggal] = useState(() => editingSale ? getSaleDate(editingSale) : getTodayIsoDate());
  const [amount, setAmount] = useState(() => editingSale ? (editingSale.total || 0).toLocaleString("id-ID") : "");
  const [catatan, setCatatan] = useState(() => editingSale ? (editingSale.notes || editingSale.customer_name || "") : "");
  const [jamuTerjualMl, setJamuTerjualMl] = useState(() => editingSale ? String(editingSale.jamu_terjual_ml || 0) : "0");
  const [restokMl, setRestokMl] = useState(() => editingSale ? String(editingSale.restok_ml || 0) : "0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (editingSale) {
      setTanggal(getSaleDate(editingSale));
      setAmount((editingSale.total || 0).toLocaleString("id-ID"));
      setCatatan(editingSale.notes || editingSale.customer_name || "");
      setJamuTerjualMl(String(editingSale.jamu_terjual_ml || 0));
      setRestokMl(String(editingSale.restok_ml || 0));
    }
  }, [editingSale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const num = parseRupiah(amount);
    if (isNaN(num) || num < 0) {
      setFormError("Masukkan jumlah pendapatan yang valid (minimal 0).");
      return;
    }
    const jamuVal = Math.max(0, Number(jamuTerjualMl) || 0);
    const restokVal = Math.max(0, Number(restokMl) || 0);

    setSaving(true);
    try {
      await createSale({
        ...(editingSale ? { id: editingSale.id } : {}),
        total: num,
        date: tanggal,
        tanggal: tanggal,
        customer_name: catatan.trim() || "Pendapatan jamu",
        notes: catatan.trim() || "Pendapatan transaksi jamu",
        payment_method: editingSale ? editingSale.payment_method : "Tunai",
        jamu_terjual_ml: jamuVal,
        restok_ml: restokVal,
        items: []
      });
      if (!editingSale) {
        setAmount("");
        setCatatan("");
        setJamuTerjualMl("0");
        setRestokMl("0");
      }
      onSuccess(
        editingSale
          ? `Transaksi ${editingSale.invoice_no} berhasil diperbarui.`
          : `Pendapatan transaksi sebesar ${money(num)} berhasil dicatat.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan pendapatan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="catat-penjualan-card">
      <div className="catat-penjualan-header">
        <p className="eyebrow">CATATAN USAHA</p>
        <h2>{editingSale ? "Edit transaksi" : "Catat penjualan"}</h2>
        <p className="subtitle">
          Catat pendapatan transaksi jamu, volume jamu terjual (ml), dan catatan restok/kulakan.
        </p>
      </div>

      {formError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertTriangle size={15} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="catat-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field-group">
            <label className="field-label">Tanggal transaksi</label>
            <input
              type="date"
              className="field-input"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label">Pendapatan (Rp)</label>
            <input
              type="text"
              className="field-input"
              value={amount}
              onChange={e => setAmount(formatRupiahInput(e.target.value))}
              placeholder="Contoh: 108.000"
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label">Jamu terjual (ml)</label>
            <input
              type="number"
              className="field-input"
              value={jamuTerjualMl}
              onChange={e => setJamuTerjualMl(e.target.value)}
              placeholder="0"
              min="0"
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label">Restok / kulakan (ml)</label>
            <input
              type="number"
              className="field-input"
              value={restokMl}
              onChange={e => setRestokMl(e.target.value)}
              placeholder="0"
              min="0"
              required
            />
          </div>
        </div>

        <div className="field-group" style={{ marginTop: 12 }}>
          <label className="field-label">Catatan (opsional)</label>
          <input
            type="text"
            className="field-input"
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Contoh: Jamu campur 200 ml / kulakan 2000 ml"
          />
        </div>

        <div className="catat-info-notice" style={{ marginTop: 12, fontSize: "11px", color: "#4f6052", background: "#f2f7f1", padding: "10px 12px", borderRadius: 6, border: "1px solid #dbe6da", lineHeight: 1.4 }}>
          <strong>Petunjuk Restok:</strong> Restok tidak boleh tercatat ganda. Jika terdapat beberapa transaksi dalam sehari, masukkan nilai restok (ml) hanya pada transaksi yang benar-benar mencatat kejadian kulakan tersebut.
        </div>

        <div className="catat-form-actions" style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            className="btn-simpan-pendapatan"
            disabled={saving}
          >
            {saving ? "Menyimpan…" : (editingSale ? "Simpan Perubahan" : "Simpan pendapatan")}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   RINGKASAN (DASHBOARD) VIEW - EXACTLY MATCHING USER SCREENSHOT
   ========================================================================= */

function DashboardView({
  products,
  sales,
  totalMonthRevenue,
  yesterdayRevenue,
  todayRevenue,
  currentDate,
  onNavigate,
  onOpenCatatPenjualan,
  onQuickEditStock,
  onOpenDailyStock,
  onViewSaleDetail
}: {
  products: Product[];
  sales: Sale[];
  totalMonthRevenue: number;
  yesterdayRevenue: number;
  todayRevenue: number;
  currentDate: Date;
  onNavigate: (v: ViewName) => void;
  onOpenCatatPenjualan?: () => void;
  onQuickEditStock: (p: Product) => void;
  onOpenDailyStock: () => void;
  onViewSaleDetail: (s: Sale) => void;
}) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const { monthRangeLabelShort, isoDate: todayIso } = useMemo(() => getJakartaDateParts(currentDate), [currentDate]);

  // 7-day trailing data dynamically calculated relative to Asia/Jakarta currentDate
  const chartDays = useMemo(() => {
    const { year, month, day } = getJakartaDateParts(currentDate);
    const monthShorts = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(year, month - 1, day - i));
      const yStr = d.getUTCFullYear();
      const mNum = d.getUTCMonth() + 1;
      const mStr = String(mNum).padStart(2, "0");
      const dNum = d.getUTCDate();
      const dStr = String(dNum).padStart(2, "0");
      const key = `${yStr}-${mStr}-${dStr}`;
      const label = `${dStr}/${mStr}`;
      const dateText = `${dNum} ${monthShorts[mNum - 1]} ${yStr}`;

      const daySales = sales.filter(s => getSaleDate(s) === key && s.status !== "Dibatalkan" && s.status !== "Batal");
      const actualAmt = daySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      days.push({
        key,
        label,
        date: dateText,
        amount: actualAmt
      });
    }
    return days;
  }, [sales, currentDate]);

  const total7Days = chartDays.reduce((sum, d) => sum + d.amount, 0);
  const maxBarAmount = Math.max(...chartDays.map(d => d.amount), 500000);

  // Latest 5 transactions matching the screenshot
  const recentSales = sales.slice(0, 5);

  return (
    <>
      {/* 1. Welcome Dark Forest Green Hero Banner */}
      <section className="welcome-banner">
        <div className="banner-content">
          <p className="banner-eyebrow">SELAMAT DATANG DI JAMU HERBAL GAMBIRONO</p>
          <h2 className="banner-title">Semoga Usaha ini Selalu Dalam Keberkahan</h2>
          <div className="banner-desc">
            <p>Pantau penjualan dan persediaan hari ini.</p>
            <p>Lebih mudah mencatat, lebih tenang mengelola toko.</p>
          </div>
          <div className="banner-badge-pill">
            <span className="banner-badge-dot" />
            <span>Tersimpan online · data bersama</span>
          </div>
        </div>

        {/* Vector Ledger Art Watermark */}
        <div className="banner-watermark" aria-hidden="true">
          <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.342a2 2 0 0 0-.602-1.43l-4.44-4.342A2 2 0 0 0 13.56 2H6a2 2 0 0 0-2 2z" />
            <path d="M14 2v6h6" />
            <path d="M8 12h8" />
            <path d="M8 16h6" />
            <path d="M8 8h2" />
          </svg>
        </div>
      </section>

      {/* 2. Top Metric Cards (side-by-side) */}
      <section className="metrics-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <div className="metric-box" onClick={() => onNavigate("history")}>
          <div className="metric-box-head">
            <span>Pendapatan hari ini</span>
            <ArrowUpRight size={14} className="metric-box-arrow" />
          </div>
          <div className="metric-box-value" style={{ color: "#166534" }}>{money(todayRevenue)}</div>
          <div className="metric-box-sub">{formatIndonesianDate(currentDate)}</div>
        </div>

        <div className="metric-box" onClick={() => onNavigate("reports")}>
          <div className="metric-box-head">
            <span>Total penjualan bulan ini</span>
            <ArrowUpRight size={14} className="metric-box-arrow" />
          </div>
          <div className="metric-box-value">{money(totalMonthRevenue)}</div>
          <div className="metric-box-sub">{monthRangeLabelShort}</div>
        </div>

        <div className="metric-box" onClick={() => onNavigate("history")}>
          <div className="metric-box-head">
            <span>Penjualan kemarin</span>
            <ArrowUpRight size={14} className="metric-box-arrow" />
          </div>
          <div className="metric-box-value">{money(yesterdayRevenue)}</div>
          <div className="metric-box-sub">Total pendapatan hari sebelumnya</div>
        </div>
      </section>

      {/* Target & Bonus Section */}
      <section className="panel" style={{ marginTop: "20px" }}>
        <div className="panel-heading">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "8px", borderRadius: "8px" }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Target Penjualan & Bonus Karyawan</h2>
              <p style={{ fontSize: "12px", color: "#627564" }}>Capai target harian dan bulanan untuk mendapatkan bonus spesial.</p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginTop: "16px" }}>
          {[
            { monthly: 2000000, daily: 70000, bonus: 100000 },
            { monthly: 3000000, daily: 100000, bonus: 200000 },
            { monthly: 4000000, daily: 135000, bonus: 300000 },
            // Add extra levels if current monthly is high
            ...(totalMonthRevenue > 4000000 ? Array.from({ length: Math.floor((totalMonthRevenue - 4000000) / 1000000) + 1 }).map((_, i) => {
              const m = 5000000 + (i * 1000000);
              return {
                monthly: m,
                daily: 70000 + ((m - 2000000) / 1000000 * 35000),
                bonus: 100000 + ((m - 2000000) / 1000000 * 100000)
              };
            }) : [])
          ].map((t, idx) => {
            const dailyReached = todayRevenue >= t.daily;
            const monthlyReached = totalMonthRevenue >= t.monthly;
            const diff = Math.max(0, t.daily - todayRevenue);
            const monthlyProgress = Math.min(100, (totalMonthRevenue / t.monthly) * 100);

            return (
              <div key={idx} style={{ 
                background: dailyReached ? "#dc2626" : "#ffffff", 
                border: dailyReached ? "1px solid #991b1b" : "1px solid #e1e9df", 
                borderRadius: "12px", 
                padding: "20px",
                boxShadow: dailyReached ? "0 10px 15px -3px rgba(220, 38, 38, 0.4)" : "0 1px 3px rgba(0,0,0,0.02)",
                color: dailyReached ? "#ffffff" : "inherit",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "11px", color: dailyReached ? "rgba(255,255,255,0.85)" : "#627564", textTransform: "uppercase", letterSpacing: "0.025em" }}>TARGET OMZET BULANAN</strong>
                    <span style={{ fontSize: "18px", fontWeight: 800, color: dailyReached ? "#ffffff" : "#1f3323" }}>{money(t.monthly)}</span>
                  </div>
                  <span style={{ 
                    padding: "6px 12px", 
                    borderRadius: "20px", 
                    fontSize: "11px", 
                    fontWeight: 800,
                    background: monthlyReached ? (dailyReached ? "rgba(255,255,255,0.2)" : "#dcfce7") : (dailyReached ? "rgba(255,255,255,0.15)" : "#f1f5f9"),
                    color: monthlyReached ? (dailyReached ? "#ffffff" : "#166534") : (dailyReached ? "#ffffff" : "#64748b"),
                    border: dailyReached ? "1px solid rgba(255,255,255,0.3)" : "none"
                  }}>
                    {monthlyReached ? "BONUS TERCAPAI" : "PROSES"}
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
                    <span style={{ color: dailyReached ? "rgba(255,255,255,0.9)" : "#627564" }}>Progres Omzet Bulan Ini</span>
                    <span style={{ fontWeight: 700 }}>{money(totalMonthRevenue)} / {money(t.monthly)}</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: dailyReached ? "rgba(0,0,0,0.2)" : "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${monthlyProgress}%`, height: "100%", background: dailyReached ? "#ffffff" : "#22c55e", transition: "width 0.5s ease" }} />
                  </div>
                </div>

                <div style={{ 
                  padding: "16px", 
                  background: dailyReached ? "rgba(0,0,0,0.2)" : "#f8faf7", 
                  borderRadius: "10px", 
                  border: dailyReached ? "1px solid rgba(255,255,255,0.15)" : "1px solid #e7eee5" 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "10px", color: dailyReached ? "rgba(255,255,255,0.8)" : "#627564", fontWeight: 600 }}>Target Minimal Harian</span>
                      <strong style={{ fontSize: "14px", fontWeight: 800 }}>{money(t.daily)}</strong>
                    </div>
                    <span style={{ 
                      padding: "6px 12px", 
                      borderRadius: "8px", 
                      fontSize: "11px", 
                      fontWeight: 900,
                      background: dailyReached ? "#ffffff" : "#fef2f2",
                      color: dailyReached ? "#dc2626" : "#b91c1c",
                      boxShadow: dailyReached ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none"
                    }}>
                      {dailyReached ? "TERCAPAI" : "BELUM TERCAPAI"}
                    </span>
                  </div>
                  {!dailyReached && (
                    <p style={{ fontSize: "11px", color: "#b91c1c", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                      <AlertTriangle size={13} /> Kurang {money(diff)} lagi hari ini
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dailyReached ? "#ffffff" : "#16a34a", boxShadow: dailyReached ? "0 0 8px rgba(255,255,255,0.5)" : "none" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: dailyReached ? "#ffffff" : "#1f3323" }}>
                    Bonus Karyawan: <strong style={{ fontSize: "14px" }}>{money(t.bonus)}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Motivation Card */}
      <section style={{ 
        marginTop: "20px", 
        background: "linear-gradient(135deg, #1f3323 0%, #2d4a34 100%)", 
        borderRadius: "16px", 
        padding: "24px",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: "24px",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ 
          background: "rgba(255,255,255,0.1)", 
          padding: "16px", 
          borderRadius: "12px",
          backdropFilter: "blur(4px)"
        }}>
          <ArrowUpRight size={32} style={{ transform: "rotate(45deg)" }} />
        </div>
        <div style={{ flex: 1, zIndex: 1 }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            AYO TINGKATKAN PENJUALAN!
          </h3>
          <p style={{ fontSize: "14px", opacity: 0.9, lineHeight: 1.5, maxWidth: "600px" }}>
            Promosikan produk ke sosial media (WhatsApp, Facebook, Instagram, dan TikTok) untuk meningkatkan penjualan, mencapai target, dan mendapatkan bonus.
          </p>
        </div>
        <div style={{ 
          position: "absolute", 
          right: "-20px", 
          bottom: "-20px", 
          opacity: 0.1,
          transform: "rotate(-15deg)"
        }}>
          <Sprout size={160} />
        </div>
      </section>

      {/* 3. Section: Stok dagangan hari ini */}
      <section className="stock-section">
        <div className="stock-section-head">
          <div>
            <h2>Stok dagangan hari ini</h2>
            <p>Input stok terakhir hari ini · Asia/Jakarta</p>
          </div>
          <button className="stock-section-link" onClick={onOpenDailyStock}>
            <span>Isi stok harian</span>
            <span>→</span>
          </button>
        </div>

        {/* 15 Stock Cards Grid */}
        <div className="stock-grid">
          {sortProductsByOrder(products).map(p => {
            const isWarning = p.stock < 1000;
            const statusText = isWarning ? "Stok menipis" : "Stok aman";
            const statusClass = isWarning ? "warning" : "safe";
            return (
              <div className={`stock-card ${statusClass}`} key={p.id}>
                <div className="stock-card-top">
                  <span className="stock-card-code" title={p.name}>
                    {p.sku || p.name}
                  </span>
                  <span className={`stock-status-pill ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
                <div className="stock-card-body">
                  <span className="stock-card-number">{p.stock}</span>
                  <span className="stock-card-unit">{p.unit}</span>
                </div>
                <div className="stock-card-foot">
                  <span className="stock-card-date">
                    {p.last_updated || "Belum ada input"}
                  </span>
                  <button
                    className="stock-card-edit-btn"
                    onClick={() => onQuickEditStock(p)}
                  >
                    Edit ↗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Two Columns: Penjualan 7 hari terakhir & Mulai dari sini */}
      <section className="mid-split-grid">
        {/* Left Column: Penjualan 7 hari terakhir */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Penjualan 7 hari terakhir</h2>
              <p>Gambaran omzet harian toko Anda</p>
            </div>
            <span className="chart-tag">7 hari</span>
          </div>

          <div className="chart-container">
            <div className="chart-bars-row">
              {chartDays.map((d, idx) => {
                const heightPercent = d.amount > 0 ? Math.max(12, Math.round((d.amount / maxBarAmount) * 100)) : 4;
                const isHovered = hoveredBarIndex === idx;
                return (
                  <div
                    key={d.label}
                    className={`chart-bar-col ${isHovered ? "active" : ""}`}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {isHovered && (
                      <div className="chart-tooltip">
                        <strong>{d.date}</strong>: {money(d.amount)}
                      </div>
                    )}
                    <div
                      className="chart-bar-fill"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="chart-x-labels">
              {chartDays.map(d => (
                <span className="chart-x-label" key={d.label}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          <div className="panel-footer-note">
            <span>Total 7 hari: </span>
            <strong>{money(total7Days)}</strong>
            <span> · Arahkan kursor ke batang untuk rincian</span>
          </div>
        </div>

        {/* Right Column: Mulai dari sini */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Mulai dari sini</h2>
              <p>Langkah kecil untuk catatan yang rapi</p>
            </div>
          </div>

          <div className="action-items-list">
            <button className="action-item-row" onClick={() => onNavigate("inventory")}>
              <div className="action-item-icon">
                <Package size={17} />
              </div>
              <div className="action-item-text">
                <strong>Kelola barang</strong>
                <small>Isi sisa stok fisik (ml)</small>
              </div>
              <ArrowUpRight size={15} className="action-item-arrow" />
            </button>

            <button
              className="action-item-row"
              onClick={() => (onOpenCatatPenjualan ? onOpenCatatPenjualan() : onNavigate("history"))}
            >
              <div className="action-item-icon">
                <Plus size={17} />
              </div>
              <div className="action-item-text">
                <strong>Catat penjualan</strong>
                <small>Input pendapatan transaksi</small>
              </div>
              <ArrowUpRight size={15} className="action-item-arrow" />
            </button>

            <button className="action-item-row" onClick={() => onNavigate("reports")}>
              <div className="action-item-icon">
                <FileText size={17} />
              </div>
              <div className="action-item-text">
                <strong>Lihat laporan</strong>
                <small>Rekap harian atau bulanan</small>
              </div>
              <ArrowUpRight size={15} className="action-item-arrow" />
            </button>
          </div>

          <div className="panel-footer-bullet">
            • Unduh cadangan secara berkala melalui Pengaturan agar catatan tetap aman.
          </div>
        </div>
      </section>

      {/* 5. Bottom Section: Transaksi terbaru */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Transaksi terbaru</h2>
            <p>Aktivitas terakhir yang Anda catat</p>
          </div>
          <button className="text-btn" onClick={() => onNavigate("history")}>
            Lihat semua →
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>TRANSAKSI</th>
                <th>TANGGAL</th>
                <th>STATUS</th>
                <th style={{ textAlign: "right" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(s => {
                const dateText = new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                }).format(new Date(s.created_at));

                return (
                  <tr key={s.id}>
                    <td className="trx-code-col">
                      <strong>{s.invoice_no}</strong>
                      <small>{s.customer_name || "Pendapatan jamu"}</small>
                    </td>
                    <td>{dateText}</td>
                    <td>
                      <span className="trx-status-pill">{s.status || "Tercatat"}</span>
                    </td>
                    <td className="trx-total-cell">
                      <div className="trx-total-wrap">
                        <span className="trx-amount">{money(s.total)}</span>
                        <button
                          className="trx-detail-btn"
                          onClick={() => onViewSaleDetail(s)}
                        >
                          Detail ↗
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* =========================================================================
   INVENTORY VIEW
   ========================================================================= */

function InventoryView({
  products,
  dailyStocks = [],
  aggregateHistory = [],
  currentDate,
  filterMode,
  setFilterMode,
  customDate,
  setCustomDate,
  selectedDate,
  onAddVariant,
  onEditProductMaster,
  onEditStock,
  onOpenBatchStock
}: {
  products: Product[];
  dailyStocks?: any[];
  aggregateHistory?: AggregateStockHistory[];
  currentDate: Date;
  filterMode: "today" | "yesterday" | "custom";
  setFilterMode: (m: "today" | "yesterday" | "custom") => void;
  customDate: string;
  setCustomDate: (d: string) => void;
  selectedDate: string;
  onAddVariant: () => void;
  onEditProductMaster: (p: Product) => void;
  onEditStock: (product: Product, targetDate: string, currentQty: number | null) => void;
  onOpenBatchStock: (targetDate: string) => void;
}) {
  const [historySearch, setHistorySearch] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const pageSize = 10;

  const todayIso = useMemo(() => getJakartaTodayIso(currentDate), [currentDate]);
  const yesterdayIso = useMemo(() => getJakartaYesterdayIso(currentDate), [currentDate]);

  // Formatted date string label with contextual indicator
  const selectedDateLabel = useMemo(() => {
    let suffix = "";
    if (selectedDate === todayIso) suffix = " (Hari Ini)";
    else if (selectedDate === yesterdayIso) suffix = " (Kemarin)";

    try {
      const d = new Date(`${selectedDate}T12:00:00Z`);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d) + suffix;
    } catch {
      return selectedDate + suffix;
    }
  }, [selectedDate, todayIso, yesterdayIso]);

  // Active products in official Gambirono sequence
  const activeProducts = useMemo(() => {
    return products.filter(p => p.aktif !== false);
  }, [products]);

  // Map of stock records strictly for the selectedDate from dailyStocks (gambirono_stok_harian)
  const dateStockMap = useMemo(() => {
    const map = new Map<string, { qty: number; status: string; tanggal: string }>();
    const entries = dailyStocks.filter(s => (s.tanggal === selectedDate || s.date === selectedDate));
    
    entries.forEach(e => {
      const pId = String(e.produk_id || e.productId || "");
      const qty = Number(e.jumlah !== undefined ? e.jumlah : (e.qty !== undefined ? e.qty : e.stock) || 0);
      const status = String(e.status || (qty < 1000 ? "Stok menipis" : "Stok aman"));
      if (pId) {
        map.set(pId, { qty, status, tanggal: e.tanggal || e.date || selectedDate });
      }
    });
    return map;
  }, [dailyStocks, selectedDate]);

  // Calculate total stock and completeness for selectedDate
  const stockSummary = useMemo(() => {
    let total = 0;
    let recordedCount = 0;
    const missingProductNames: string[] = [];

    activeProducts.forEach(p => {
      const record = dateStockMap.get(p.id) || (p.sku ? dateStockMap.get(p.sku) : undefined) || (p.code ? dateStockMap.get(p.code) : undefined);
      if (record !== undefined) {
        total += record.qty;
        recordedCount++;
      } else {
        missingProductNames.push(p.sku || p.name);
      }
    });

    const totalRequired = activeProducts.length || 14;
    const isComplete = recordedCount >= totalRequired && totalRequired > 0;

    return {
      total,
      recordedCount,
      totalRequired,
      isComplete,
      missingProductNames
    };
  }, [activeProducts, dateStockMap]);

  // Filter and sort aggregate history
  const filteredHistory = useMemo(() => {
    return aggregateHistory.filter(h => {
      const searchKey = `${h.tanggal} ${h.keterangan || ""} ${h.jenis_perubahan || ""}`.toLowerCase();
      
      const matchesSearch = !historySearch || searchKey.includes(historySearch.toLowerCase().trim());
      const matchesDate = !historyDate || h.tanggal === historyDate;

      return matchesSearch && matchesDate;
    });
  }, [aggregateHistory, historySearch, historyDate]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, historyDate]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  return (
    <section className="inventory-panel">
      {/* 1. FILTER TANGGAL (Hari Ini | Kemarin | Pilih Tanggal) */}
      <div className="inv-date-filter-container">
        <div className="inv-date-filter-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#1f3323", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Filter Tanggal Stok:
            </span>
            <div className="inv-date-segmented-group" role="tablist">
              <button
                type="button"
                className={`inv-date-segment-btn ${filterMode === "today" ? "active" : ""}`}
                onClick={() => setFilterMode("today")}
                title={`Lihat stok hari ini (${todayIso})`}
              >
                <Calendar size={13} />
                <span>Hari Ini</span>
              </button>
              <button
                type="button"
                className={`inv-date-segment-btn ${filterMode === "yesterday" ? "active" : ""}`}
                onClick={() => setFilterMode("yesterday")}
                title={`Lihat stok kemarin (${yesterdayIso})`}
              >
                <RotateCcw size={13} />
                <span>Kemarin</span>
              </button>
              <button
                type="button"
                className={`inv-date-segment-btn ${filterMode === "custom" ? "active" : ""}`}
                onClick={() => setFilterMode("custom")}
                title="Pilih tanggal khusus"
              >
                <span>Pilih Tanggal</span>
              </button>
            </div>

            {filterMode === "custom" && (
              <div className="inv-date-picker-wrap">
                <input
                  type="date"
                  className="inv-date-picker-input"
                  value={customDate}
                  max={todayIso}
                  onChange={e => {
                    if (e.target.value) {
                      setCustomDate(e.target.value);
                    }
                  }}
                  title="Pilih tanggal stok (maksimal hari ini)"
                />
              </div>
            )}
          </div>

          <div className="inv-date-info-badge">
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
            <span>
              Menampilkan stok: <strong>{selectedDateLabel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ringkasan Total Stok Card */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: stockSummary.isComplete ? "#f3f8f2" : (stockSummary.recordedCount > 0 ? "#fffbeb" : "#f8fafc"),
        border: stockSummary.isComplete ? "1px solid #d5e4d3" : (stockSummary.recordedCount > 0 ? "1px solid #fef3c7" : "1px dashed #cbd5e1"),
        padding: "16px 20px",
        borderRadius: 10,
        marginBottom: 18,
        transition: "all 0.2s ease"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: stockSummary.isComplete ? "#325338" : (stockSummary.recordedCount > 0 ? "#92400e" : "#475569"), textTransform: "uppercase", letterSpacing: "0.5px" }}>
              TOTAL STOK JAMU (ML)
            </span>
            <span style={{
              fontSize: "10px",
              fontWeight: 800,
              padding: "2.5px 8px",
              borderRadius: "12px",
              background: stockSummary.isComplete ? "#dcfce7" : (stockSummary.recordedCount > 0 ? "#fef3c7" : "#f1f5f9"),
              color: stockSummary.isComplete ? "#166534" : (stockSummary.recordedCount > 0 ? "#b45309" : "#64748b")
            }}>
              {stockSummary.isComplete
                ? "Total Lengkap (14 produk tercatat)"
                : stockSummary.recordedCount > 0
                  ? `Belum Lengkap (${stockSummary.recordedCount}/${stockSummary.totalRequired} produk tercatat)`
                  : `Belum Ada Input (0/${stockSummary.totalRequired} produk)`}
            </span>
          </div>
          <p style={{ fontSize: "11.5px", color: stockSummary.isComplete ? "#617563" : (stockSummary.recordedCount > 0 ? "#b45309" : "#64748b"), margin: "4px 0 0" }}>
            {stockSummary.isComplete
              ? `Total keseluruhan stok fisik seluruh 14 varian jamu pada ${selectedDateLabel}`
              : stockSummary.recordedCount > 0
                ? `Data stok belum lengkap untuk tanggal ${selectedDateLabel}. Varian belum dicatat: ${stockSummary.missingProductNames.join(", ")}`
                : `Belum ada catatan stok fisik untuk tanggal ${selectedDateLabel}. Tekan tombol isi stok di bawah untuk mencatat stok.`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          {stockSummary.recordedCount > 0 ? (
            <strong style={{ fontSize: "24px", color: stockSummary.isComplete ? "#1f4a2b" : "#92400e", fontWeight: 800 }}>
              {stockSummary.total.toLocaleString("id-ID")} ml{stockSummary.isComplete ? "" : "*"}
            </strong>
          ) : (
            <strong style={{ fontSize: "20px", color: "#64748b", fontWeight: 700 }}>
              Belum ada input
            </strong>
          )}
        </div>
      </div>

      {/* 3. Actions Bar */}
      <div className="inventory-actions-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: "12px", color: "#617563" }}>
          Sisa fisik per produk pada <strong>{selectedDateLabel}</strong>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: "12px" }}
            onClick={() => onOpenBatchStock(selectedDate)}
            title={`Isi stok seluruh varian untuk tanggal ${selectedDate}`}
          >
            Isi stok tanggal ini ({selectedDate})
          </button>
          <button
            type="button"
            className="btn-variant-pill"
            onClick={onAddVariant}
          >
            + Tambah varian
          </button>
        </div>
      </div>

      {/* 4. Product Stock Cards Grid */}
      <div className="inventory-stock-grid">
        {sortProductsByOrder(activeProducts).map(p => {
          const record = dateStockMap.get(p.id) || (p.sku ? dateStockMap.get(p.sku) : undefined) || (p.code ? dateStockMap.get(p.code) : undefined);
          const hasInput = record !== undefined;
          const qty = hasInput ? record.qty : null;
          const isWarning = hasInput ? (qty! < 1000) : false;
          const statusClass = !hasInput ? "unrecorded" : (isWarning ? "warning" : "safe");
          const statusText = !hasInput ? "Belum diinput" : (isWarning ? "Stok menipis" : "Stok aman");
          const displayCode = p.sku || p.code || p.name;
          const displayDate = hasInput ? record.tanggal : "Belum ada catatan";

          return (
            <div key={p.id} className={`inv-stock-card ${statusClass}`}>
              <div className="inv-card-header">
                <span className="inv-card-code" title={p.name}>
                  {displayCode === "MADU LANANG" ? (
                    <>
                      MADU<br />LANANG
                    </>
                  ) : (
                    displayCode
                  )}
                </span>
                <span className={`inv-status-pill ${statusClass}`}>
                  {statusText}
                </span>
              </div>
              <div className="inv-card-body">
                {hasInput ? (
                  <>
                    <span className="inv-card-qty">{qty!.toLocaleString("id-ID")}</span>
                    <span className="inv-card-unit">{p.unit}</span>
                  </>
                ) : (
                  <span className="inv-card-qty" style={{ fontSize: "18px", color: "#94a3b8", fontWeight: 700 }}>
                    — <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#94a3b8" }}>Belum diisi</span>
                  </span>
                )}
              </div>
              <div className="inv-card-footer">
                <span className="inv-card-date">{displayDate}</span>
                <button
                  type="button"
                  className="inv-edit-link"
                  onClick={() => onEditStock(p, selectedDate, qty)}
                  title={`Edit catatan stok ${p.sku || p.name} pada ${selectedDate}`}
                >
                  {hasInput ? "Edit ↗" : "+ Isi stok ↗"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Tabel Riwayat Update Stok */}
      <div className="panel" style={{ marginTop: 28 }}>
        <div className="panel-heading" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f3323" }}>Riwayat Total Stok Toko</h2>
            <p style={{ fontSize: "12px", color: "#627564", margin: "2px 0 0" }}>Rekap perubahan total keseluruhan stok 14 produk jamu herbal Gambirono</p>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="toolbar-filters">
            <div className="searchbox" style={{ flex: 1, maxWidth: 400 }}>
              <Search size={16} />
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Cari keterangan atau jenis perubahan…"
              />
            </div>
            <input
              type="date"
              className="toolbar-date-input"
              value={historyDate}
              onChange={e => setHistoryDate(e.target.value)}
              title="Filter tanggal update stok"
            />
            {historyDate && (
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => setHistoryDate("")}
              >
                Semua tanggal
              </button>
            )}
          </div>
          <span style={{ fontSize: "11.5px", color: "#596e5c", fontWeight: 600, whiteSpace: "nowrap" }}>
            Menampilkan {paginatedHistory.length} dari {filteredHistory.length} riwayat total stok
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>TANGGAL UPDATE</th>
                <th>WAKTU UPDATE</th>
                <th style={{ textAlign: "right" }}>TOTAL STOK SEBELUMNYA (ML)</th>
                <th style={{ textAlign: "right" }}>TOTAL STOK TERBARU (ML)</th>
                <th style={{ textAlign: "center" }}>PERUBAHAN STOK (ML)</th>
                <th>JENIS PERUBAHAN</th>
                <th>KETERANGAN</th>
                <th style={{ textAlign: "right" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((h, idx) => {
                  let dateStr = h.tanggal;
                  let timeStr = "12:00:00 WIB";

                  try {
                    const dt = new Date(h.waktu_update || `${h.tanggal}T12:00:00Z`);
                    if (!isNaN(dt.getTime())) {
                      dateStr = new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }).format(dt);

                      timeStr = new Intl.DateTimeFormat("id-ID", {
                        timeZone: "Asia/Jakarta",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false
                      }).format(dt) + " WIB";
                    }
                  } catch {
                    // ignore
                  }

                  const delta = h.perubahan_stok;

                  return (
                    <tr key={h.id || idx}>
                      <td style={{ fontSize: "11px", color: "#8a968b" }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: "12px", color: "#253628" }}>{dateStr}</td>
                      <td style={{ fontSize: "11px", color: "#617363" }}>{timeStr}</td>
                      <td style={{ textAlign: "right", fontSize: "12px" }}>
                        {(h.total_stok_sebelumnya || 0).toLocaleString("id-ID")} ml
                      </td>
                      <td style={{ textAlign: "right", fontSize: "12px", fontWeight: 700, color: "#1f4a2b" }}>
                        {(h.total_stok_terbaru || 0).toLocaleString("id-ID")} ml
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: "11px",
                            fontWeight: 700,
                            background: delta > 0 ? "#f0fdf4" : delta < 0 ? "#fef2f2" : "#f1f5f1",
                            color: delta > 0 ? "#15803d" : delta < 0 ? "#b91c1c" : "#4f6052"
                          }}
                        >
                          {delta > 0 ? `+${delta.toLocaleString("id-ID")} ml` : delta < 0 ? `${delta.toLocaleString("id-ID")} ml` : `0 ml`}
                        </span>
                      </td>
                      <td>
                        <span className="trx-status-pill" style={{ 
                          background: delta > 0 ? "#dcfce7" : delta < 0 ? "#fee2e2" : "#f1f5f1", 
                          color: delta > 0 ? "#15803d" : delta < 0 ? "#b91c1c" : "#4f6052",
                          border: "none"
                        }}>
                          {h.jenis_perubahan || "Tidak berubah"}
                        </span>
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#516353", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.keterangan || "Input stok harian"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="trx-detail-btn"
                          onClick={() => setSelectedHistory(h)}
                        >
                          Detail ↗
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "28px", color: "#7a8a7c", fontSize: "12px" }}>
                    Belum ada riwayat update stok yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e3ebe2" }}>
            <span style={{ fontSize: "12px", color: "#617363" }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "5px 12px", fontSize: "12px" }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "5px 12px", fontSize: "12px" }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Mutasi Stok (Sekarang Detail Riwayat Stok) */}
      {selectedHistory && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedHistory(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <p className="eyebrow">DETAIL RIWAYAT STOK</p>
                <h2>Total Stok Toko</h2>
                <p>
                  {selectedHistory.tanggal} · {selectedHistory.jenis_perubahan || "Update Stok"}
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedHistory(null)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ background: "#f8faf7", border: "1px solid #e7eee5", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Waktu Pencatatan</span>
                <strong>
                  {new Date(selectedHistory.waktu_update || `${selectedHistory.tanggal}T12:00:00Z`).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Jakarta" })}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Total Stok Sebelumnya</span>
                <span>{(selectedHistory.total_stok_sebelumnya || 0).toLocaleString("id-ID")} ml</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Total Stok Terbaru</span>
                <strong style={{ color: "#1f4a2b" }}>{(selectedHistory.total_stok_terbaru || 0).toLocaleString("id-ID")} ml</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Perubahan Stok</span>
                <strong style={{ color: (selectedHistory.perubahan_stok || 0) > 0 ? "#15803d" : (selectedHistory.perubahan_stok || 0) < 0 ? "#b91c1c" : "#4f6052" }}>
                  {(selectedHistory.perubahan_stok || 0) > 0 ? `+${(selectedHistory.perubahan_stok || 0).toLocaleString("id-ID")} ml` : `${(selectedHistory.perubahan_stok || 0).toLocaleString("id-ID")} ml`}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: "12px" }}>
                <span style={{ color: "#7a887b" }}>Jenis Perubahan</span>
                <span className="trx-status-pill">{selectedHistory.jenis_perubahan || "Stok Harian"}</span>
              </div>
              {selectedHistory.keterangan && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #e1e9df", fontSize: "12px" }}>
                  <span style={{ color: "#7a887b" }}>Keterangan</span>
                  <span>{selectedHistory.keterangan}</span>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedHistory(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================================
   SALES / POS VIEW
   ========================================================================= */

function SalesView({
  products,
  cart,
  setCart,
  addToCart,
  customer,
  setCustomer,
  payment,
  setPayment,
  notes,
  setNotes,
  total,
  onSubmit,
  saving
}: {
  products: Product[];
  cart: { product_id: string; qty: number; unit_price: number }[];
  setCart: React.Dispatch<React.SetStateAction<{ product_id: string; qty: number; unit_price: number }[]>>;
  addToCart: (p: Product) => void;
  customer: string;
  setCustomer: (s: string) => void;
  payment: string;
  setPayment: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  total: number;
  onSubmit: () => void;
  saving: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const available = products.filter(p =>
    `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="sales-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Pilih barang jamu</h2>
            <p>Pilih varian produk jamu untuk ditambahkan ke transaksi</p>
          </div>
        </div>
        <div className="searchbox sales-search">
          <Search size={16} />
          <input
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Cari nama atau kode jamu…"
          />
        </div>
        <div className="product-picker">
          {available.map(p => (
            <button
              key={p.id}
              className="pick-product"
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
            >
              <div className="product-symbol">
                <Sprout size={16} />
              </div>
              <div className="pick-info">
                <strong>{p.sku || p.name} - {p.name}</strong>
                <small>{p.stock} {p.unit} tersedia</small>
                <b>{money(p.sell_price)}</b>
              </div>
              <Plus size={16} style={{ color: "#377048" }} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel checkout-panel">
        <div className="panel-heading">
          <div>
            <h2>Ringkasan transaksi</h2>
            <p>Periksa pesanan sebelum disimpan</p>
          </div>
          <ShoppingCart size={18} style={{ color: "#7a8a7d" }} />
        </div>

        <div style={{ padding: "0 20px" }}>
          <label className="field-label" style={{ marginBottom: 12 }}>
            Keterangan / Nama pembeli (opsional)
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="Pendapatan jamu"
            />
          </label>
          <label className="field-label" style={{ marginBottom: 12 }}>
            Metode pembayaran
            <select value={payment} onChange={e => setPayment(e.target.value)}>
              <option>Tunai</option>
              <option>QRIS</option>
              <option>Transfer</option>
              <option>Lainnya</option>
            </select>
          </label>
        </div>

        <div className="cart-items">
          {cart.length ? (
            cart.map(item => {
              const p = products.find(x => x.id === item.product_id);
              if (!p) return null;
              return (
                <div className="cart-row" key={item.product_id}>
                  <div className="cart-name">
                    <strong>{p.sku || p.name}</strong>
                    <small>{money(item.unit_price)} / {p.unit}</small>
                  </div>
                  <div className="qty-control">
                    <button
                      onClick={() =>
                        setCart(old =>
                          old.map(x =>
                            x.product_id === item.product_id
                              ? { ...x, qty: Math.max(1, x.qty - 1) }
                              : x
                          )
                        )
                      }
                    >
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      onClick={() =>
                        setCart(old =>
                          old.map(x =>
                            x.product_id === item.product_id
                              ? { ...x, qty: Math.min(p.stock, x.qty + 1) }
                              : x
                          )
                        )
                      }
                      disabled={item.qty >= p.stock}
                    >
                      +
                    </button>
                  </div>
                  <strong className="cart-subtotal">
                    {money(item.qty * item.unit_price)}
                  </strong>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      setCart(old => old.filter(x => x.product_id !== item.product_id))
                    }
                    aria-label="Hapus"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#8a968b", fontSize: "11px" }}>
              Keranjang masih kosong. Pilih barang di sebelah kiri.
            </div>
          )}
        </div>

        <div style={{ padding: "0 20px" }}>
          <label className="field-label" style={{ marginBottom: 14 }}>
            Catatan
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan transaksi tambahan"
            />
          </label>
        </div>

        <div className="checkout-total">
          <span>Total pembayaran</span>
          <strong>{money(total)}</strong>
        </div>

        <button
          className="btn btn-primary checkout-submit"
          onClick={onSubmit}
          disabled={saving || !cart.length}
        >
          {saving ? "Menyimpan transaksi…" : <>Simpan transaksi</>}
        </button>
      </section>
    </div>
  );
}

/* =========================================================================
   HISTORY VIEW
   ========================================================================= */

function HistoryView({
  sales,
  search,
  setSearch,
  filterDate,
  setFilterDate,
  onViewDetail
}: {
  sales: Sale[];
  search: string;
  setSearch: (s: string) => void;
  filterDate: string;
  setFilterDate: (d: string) => void;
  onViewDetail: (s: Sale) => void;
}) {
  return (
    <section className="panel">
      <div className="toolbar">
        <div className="toolbar-filters">
          <div className="searchbox" style={{ flex: 1, maxWidth: 500 }}>
            <Search size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nomor, barang, atau catatan..."
            />
          </div>
          <input
            type="date"
            className="toolbar-date-input"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            title="Filter tanggal transaksi"
          />
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setFilterDate("")}
          >
            Semua tanggal
          </button>
        </div>
        <span style={{ fontSize: "11px", color: "#8a968b", whiteSpace: "nowrap" }}>
          {sales.length} transaksi
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>TRANSAKSI</th>
              <th>TANGGAL</th>
              <th>STATUS</th>
              <th style={{ textAlign: "right" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => {
              const saleDateStr = getSaleDate(s);
              let dateText = saleDateStr;
              try {
                const parts = saleDateStr.split("-");
                if (parts.length === 3) {
                  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  dateText = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  }).format(dt);
                }
              } catch {
                dateText = saleDateStr;
              }

              return (
                <tr key={s.id}>
                  <td className="trx-code-col">
                    <strong>{s.invoice_no}</strong>
                    <small style={{ display: "block", color: "#8a968b", marginTop: 2, fontSize: "11px" }}>
                      {s.customer_name || s.notes || "Pendapatan jamu"}
                    </small>
                  </td>
                  <td>{dateText}</td>
                  <td>
                    <span className="trx-status-pill">{s.status || "Tercatat"}</span>
                  </td>
                  <td className="trx-total-cell">
                    <div className="trx-total-wrap">
                      <span className="trx-amount">{money(s.total)}</span>
                      <button className="trx-detail-btn" onClick={() => onViewDetail(s)}>
                        Detail ↗
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================================
   REPORTS VIEW
   ========================================================================= */



function ReportsView({
  sales,
  dailyStocks = [],
  products = [],
  onExport,
  onViewDetail
}: {
  sales: Sale[];
  dailyStocks?: any[];
  products?: Product[];
  onExport: () => void;
  onViewDetail: (s: Sale) => void;
}) {
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const todayMonth = useMemo(() => todayIso.slice(0, 7), [todayIso]);

  const [periodMode, setPeriodMode] = useState<"daily" | "monthly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>(todayMonth);

  const latestDate = useMemo(() => {
    for (const s of sales) {
      const d = getSaleDate(s);
      if (d) return d;
    }
    return todayIso;
  }, [sales, todayIso]);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Sync selectedDate with latest available sale date when data changes
  useEffect(() => {
    if (latestDate) {
      setSelectedDate(latestDate);
    }
  }, [latestDate]);

  // Sort state
  const [sortField, setSortField] = useState<"date" | "total" | "nomor">("date");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter sales based on period
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = getSaleDate(s);
      if (!saleDate) return false;
      if (periodMode === "monthly") {
        return saleDate.startsWith(selectedMonth);
      }
      return saleDate === selectedDate;
    });
  }, [sales, periodMode, selectedMonth, selectedDate]);

  // Sort sales according to current sort criteria
  const displaySales = useMemo(() => {
    const list = [...filteredSales];
    list.sort((a, b) => {
      if (sortField === "total") {
        return sortAsc ? Number(a.total) - Number(b.total) : Number(b.total) - Number(a.total);
      }
      if (sortField === "nomor") {
        return sortAsc ? a.invoice_no.localeCompare(b.invoice_no) : b.invoice_no.localeCompare(a.invoice_no);
      }
      const da = getSaleDate(a);
      const db = getSaleDate(b);
      const diff = da.localeCompare(db);
      if (diff !== 0) return sortAsc ? diff : -diff;
      return sortAsc ? a.invoice_no.localeCompare(b.invoice_no) : b.invoice_no.localeCompare(a.invoice_no);
    });
    return list;
  }, [filteredSales, sortField, sortAsc]);

  // Statistics dynamically computed from current filtered sales
  const validSales = useMemo(() => filteredSales.filter(s => s.status !== "Dibatalkan" && s.status !== "Batal"), [filteredSales]);

  const totalPenjualan = useMemo(() => validSales.reduce((sum, s) => sum + Number(s.total || 0), 0), [validSales]);
  const transaksiTercatat = validSales.length;

  const totalJamuTerjualMl = useMemo(() => validSales.reduce((sum, s) => sum + Number(s.jamu_terjual_ml || 0), 0), [validSales]);
  const totalRestokMl = useMemo(() => validSales.reduce((sum, s) => sum + Number(s.restok_ml || 0), 0), [validSales]);

  // Helper: get total stock on a given ISO date with completeness check
  const getStockInfoForDate = useCallback((targetDate: string): { total: number; isComplete: boolean; count: number } => {
    const activeProducts = products.filter(p => p.aktif !== false);
    const requiredCount = activeProducts.length || 14;

    const entries = dailyStocks.filter(s => (s.tanggal === targetDate || s.date === targetDate));
    
    // If we have entries for this date, check if they cover all active products
    if (entries.length > 0) {
      const uniqueProductIds = new Set(entries.map(e => e.produk_id || e.productId));
      const total = entries.reduce((sum, item) => sum + Number(item.jumlah !== undefined ? item.jumlah : (item.qty !== undefined ? item.qty : item.stock) || 0), 0);
      return {
        total,
        isComplete: uniqueProductIds.size >= requiredCount,
        count: uniqueProductIds.size
      };
    }

    return { total: null as any, isComplete: false, count: 0 };
  }, [dailyStocks, products]);

  // Reconciliation data
  const reconciliationData = useMemo(() => {
    const activeCount = products.filter(p => p.aktif).length || 14;

    if (periodMode === "daily") {
      const prevDate = getJakartaYesterdayIso(new Date(`${selectedDate}T12:00:00Z`));
      const infoToday = getStockInfoForDate(selectedDate);
      const infoYesterday = getStockInfoForDate(prevDate);

      const hasStockData = infoToday.count > 0 && infoYesterday.count > 0;
      const isComplete = infoToday.isComplete && infoYesterday.isComplete;
      const calculatedSold = hasStockData ? infoYesterday.total - infoToday.total + totalRestokMl : 0;
      const diff = totalJamuTerjualMl - calculatedSold;

      return {
        hasStockData,
        isComplete,
        inputSales: totalJamuTerjualMl,
        inputRestock: totalRestokMl,
        stokToday: infoToday.total,
        stokYesterday: infoYesterday.total,
        calculatedSold,
        diff,
        missingDays: !infoToday.isComplete ? [selectedDate] : (!infoYesterday.isComplete ? [prevDate] : [])
      };
    } else {
      // Monthly mode: calculate day-by-day accumulation
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const daysInMonth = new Date(year, month, 0).getDate();

      let accumulatedCalculatedSold = 0;
      let validDaysCount = 0;
      const missingDays: string[] = [];
      const incompleteDays: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = String(day).padStart(2, "0");
        const currIso = `${yearStr}-${monthStr}-${dStr}`;
        const prevIso = getJakartaYesterdayIso(new Date(`${currIso}T12:00:00Z`));

        // Skip future dates
        if (currIso > todayIso) continue;

        const dayValidSales = sales.filter(s => getSaleDate(s) === currIso && s.status !== "Dibatalkan" && s.status !== "Batal");
        const dayRestock = dayValidSales.reduce((sum, s) => sum + Number(s.restok_ml || 0), 0);

        const infoToday = getStockInfoForDate(currIso);
        const infoYesterday = getStockInfoForDate(prevIso);

        if (infoToday.total !== null && infoYesterday.total !== null) {
          const dayCalculatedSold = (infoYesterday.total - infoToday.total) + dayRestock;
          accumulatedCalculatedSold += dayCalculatedSold;
          validDaysCount++;
          if (!infoToday.isComplete || !infoYesterday.isComplete) {
            incompleteDays.push(currIso);
          }
        } else {
          missingDays.push(currIso);
        }
      }

      const hasStockData = validDaysCount > 0;
      const isComplete = missingDays.length === 0 && incompleteDays.length === 0;
      const diff = totalJamuTerjualMl - accumulatedCalculatedSold;

      return {
        hasStockData,
        isComplete,
        inputSales: totalJamuTerjualMl,
        inputRestock: totalRestokMl,
        stokToday: null,
        stokYesterday: null,
        calculatedSold: accumulatedCalculatedSold,
        diff,
        missingDays,
        incompleteDays,
        validDaysCount
      };
    }
  }, [periodMode, selectedDate, selectedMonth, totalJamuTerjualMl, totalRestokMl, getStockInfoForDate, sales, products, todayIso]);

  const monthNameMap: Record<string, string> = {
    "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
    "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
    "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
  };

  const periodCaption = useMemo(() => {
    if (periodMode === "monthly") {
      const [y, m] = selectedMonth.split("-");
      const mName = monthNameMap[m] || m;
      return `${mName} ${y}`;
    } else {
      const [y, m, d] = selectedDate.split("-");
      const mName = monthNameMap[m] || m;
      return `${Number(d)} ${mName} ${y}`;
    }
  }, [periodMode, selectedMonth, selectedDate]);

  const monthDisplayLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    const enMonths: Record<string, string> = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December"
    };
    return `${enMonths[m] || m} ${y}`;
  }, [selectedMonth]);

  return (
    <>
      {/* Filter Panel (Matches image_6ae483cc.png) */}
      <section className="report-filter-panel">
        <div className="report-filter-controls">
          <div className="report-toggle-group">
            <button
              type="button"
              className={`report-toggle-btn ${periodMode === "daily" ? "active" : ""}`}
              onClick={() => setPeriodMode("daily")}
            >
              Harian
            </button>
            <button
              type="button"
              className={`report-toggle-btn ${periodMode === "monthly" ? "active" : ""}`}
              onClick={() => setPeriodMode("monthly")}
            >
              Bulanan
            </button>
          </div>

          {periodMode === "monthly" ? (
            <div className="report-date-selector" style={{ position: "relative", cursor: "pointer" }}>
              <span>{monthDisplayLabel}</span>
              <Calendar size={13} style={{ color: "#526754" }} />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => e.target.value && setSelectedMonth(e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%"
                }}
                title="Pilih bulan"
              />
            </div>
          ) : (
            <div className="report-date-selector">
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className="report-export-btn"
          onClick={onExport}
        >
          <Download size={13} /> Ekspor CSV
        </button>
      </section>

      {/* Period Subtitle */}
      <div className="report-period-caption">
        Periode: <strong>{periodCaption}</strong> · Asia/Jakarta
      </div>

      {/* 4 KPI Cards (Section C) */}
      <div className="report-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <span className="report-kpi-label">Total penjualan</span>
            <div className="report-kpi-badge">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{money(totalPenjualan)}</div>
          <div className="report-kpi-footer">Pendapatan transaksi yang sah</div>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <span className="report-kpi-label">Total transaksi</span>
            <div className="report-kpi-badge">
              <FileText size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{transaksiTercatat}</div>
          <div className="report-kpi-footer">Transaksi yang sah</div>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <span className="report-kpi-label">Jamu terjual (ml)</span>
            <div className="report-kpi-badge">
              <Sprout size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{totalJamuTerjualMl.toLocaleString("id-ID")} ml</div>
          <div className="report-kpi-footer">Input volume penjualan karyawan</div>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <span className="report-kpi-label">Restok / kulakan (ml)</span>
            <div className="report-kpi-badge">
              <Download size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{totalRestokMl.toLocaleString("id-ID")} ml</div>
          <div className="report-kpi-footer">Total restok jamu periode ini</div>
        </div>
      </div>

      {/* Section D & E: Rekonsiliasi Stok dan Penjualan Jamu */}
      <section className="report-table-panel" style={{ marginBottom: 24, padding: 20, background: "#ffffff", borderRadius: 12, border: "1px solid #e1e9df" }}>
        <div className="report-table-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: "16px", color: "#253628", fontWeight: 700, margin: 0 }}>Rekonsiliasi Stok dan Penjualan Jamu</h2>
            <p style={{ fontSize: "11.5px", color: "#7a8a7c", margin: "4px 0 0" }}>
              Perbandingan jamu terjual (input) dengan hasil kalkulasi perubahan fisik stok (Stok Kemarin − Stok Hari Ini + Restok).
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div style={{ background: "#f8faf7", border: "1px solid #e4ede3", padding: "14px 16px", borderRadius: 8 }}>
            <span style={{ fontSize: "11px", color: "#6e7d70", fontWeight: 600 }}>Jamu Terjual (Input)</span>
            <strong style={{ display: "block", fontSize: "20px", color: "#255333", marginTop: 4 }}>
              {reconciliationData.inputSales.toLocaleString("id-ID")} ml
            </strong>
            <span style={{ fontSize: "10px", color: "#8a968b" }}>Catatan formulir transaksi</span>
          </div>

          <div style={{ background: "#f8faf7", border: "1px solid #e4ede3", padding: "14px 16px", borderRadius: 8 }}>
            <span style={{ fontSize: "11px", color: "#6e7d70", fontWeight: 600 }}>Stok Terjual (Hasil Perhitungan)</span>
            <strong style={{ display: "block", fontSize: "20px", color: reconciliationData.hasStockData ? "#255333" : "#d97706", marginTop: 4 }}>
              {reconciliationData.hasStockData 
                ? `${reconciliationData.calculatedSold.toLocaleString("id-ID")} ml` 
                : "Data tidak tersedia"}
              {reconciliationData.hasStockData && !reconciliationData.isComplete && (
                <span style={{ fontSize: "10px", color: "#d97706", display: "block", fontWeight: 500 }}> (Parsial)</span>
              )}
            </strong>
            <span style={{ fontSize: "10px", color: "#8a968b" }}>
              {periodMode === "daily" ? "Formula: Stok Kemarin − Stok Hari Ini + Restok" : `Akumulasi ${reconciliationData.validDaysCount || 0} hari valid`}
            </span>
          </div>

          <div style={{
            background: !reconciliationData.hasStockData ? "#fffbeb" : (!reconciliationData.isComplete ? "#fff7ed" : (reconciliationData.diff === 0 ? "#f0fdf4" : "#fef2f2")),
            border: `1px solid ${!reconciliationData.hasStockData ? "#fcd34d" : (!reconciliationData.isComplete ? "#fdba74" : (reconciliationData.diff === 0 ? "#86efac" : "#fca5a5"))}`,
            padding: "14px 16px",
            borderRadius: 8
          }}>
            <span style={{ fontSize: "11px", color: "#6e7d70", fontWeight: 600 }}> Rekonsiliasi</span>
            <strong style={{
              display: "block",
              fontSize: "20px",
              color: !reconciliationData.hasStockData ? "#d97706" : (!reconciliationData.isComplete ? "#ea580c" : (reconciliationData.diff === 0 ? "#15803d" : "#b91c1c")),
              marginTop: 4
            }}>
              {!reconciliationData.hasStockData ? "—" : `${reconciliationData.diff > 0 ? "+" : ""}${reconciliationData.diff.toLocaleString("id-ID")} ml`}
            </strong>
            <span style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 12,
              marginTop: 4,
              background: !reconciliationData.hasStockData ? "#fef3c7" : (!reconciliationData.isComplete ? "#ffedd5" : (reconciliationData.diff === 0 ? "#dcfce7" : "#fee2e2")),
              color: !reconciliationData.hasStockData ? "#b45309" : (!reconciliationData.isComplete ? "#9a3412" : (reconciliationData.diff === 0 ? "#15803d" : "#b91c1c"))
            }}>
              {!reconciliationData.hasStockData
                ? "Data stok kosong"
                : (!reconciliationData.isComplete ? "Data belum lengkap" : (reconciliationData.diff === 0 ? "Sesuai" : "Perlu pemeriksaan"))}
            </span>
          </div>
        </div>

        <div style={{
          fontSize: "11.5px",
          lineHeight: 1.5,
          color: "#4f6052",
          background: "#f9faf8",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid #e7eee6"
        }}>
          {!reconciliationData.hasStockData ? (
            <span>Catatan stok harian belum tersedia pada periode ini. Silakan isi stok harian pada menu Barang & stok.</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reconciliationData.diff === 0 && reconciliationData.isComplete ? (
                <span>Laporan penjualan karyawan tepat sesuai dengan perubahan stok fisik di toko (0 ml).</span>
              ) : (
                <span>
                  {reconciliationData.isComplete ? "Analisis:" : "Analisis (Berdasarkan data parsial):"} Terdapat selisih <strong>{reconciliationData.diff > 0 ? "+" : ""}{reconciliationData.diff.toLocaleString("id-ID")} ml</strong>. Laporan karyawan ({reconciliationData.inputSales.toLocaleString("id-ID")} ml) {reconciliationData.diff > 0 ? "lebih besar" : "lebih kecil"} daripada hasil perhitungan perubahan fisik stok ({reconciliationData.calculatedSold.toLocaleString("id-ID")} ml).
                </span>
              )}
              
              {!reconciliationData.isComplete && (
                <div style={{ marginTop: 4, padding: "8px 12px", background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 6, color: "#9a3412" }}>
                  <strong>Data belum lengkap:</strong> Kalkulasi di atas hanya mencakup {reconciliationData.validDaysCount} hari yang memiliki data stok lengkap (14 produk).
                  {(reconciliationData.missingDays || []).length > 0 && (
                    <div style={{ marginTop: 4, fontSize: "10.5px" }}>
                      Hari tanpa data stok: {reconciliationData.missingDays?.slice(0, 5).join(", ")}{(reconciliationData.missingDays?.length || 0) > 5 ? "..." : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Laporan Transaksi Panel */}
      <section className="report-table-panel">
        <div className="report-table-header">
          <h2>Laporan transaksi</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th
                  onClick={() => {
                    if (sortField === "nomor") setSortAsc(v => !v);
                    else { setSortField("nomor"); setSortAsc(true); }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Klik untuk mengurutkan transaksi"
                >
                  TRANSAKSI {sortField === "nomor" && (sortAsc ? "▲" : "▼")}
                </th>
                <th
                  onClick={() => {
                    if (sortField === "date") setSortAsc(v => !v);
                    else { setSortField("date"); setSortAsc(true); }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Klik untuk mengurutkan tanggal"
                >
                  TANGGAL {sortField === "date" && (sortAsc ? "▲" : "▼")}
                </th>
                <th>STATUS</th>
                <th
                  style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}
                  onClick={() => {
                    if (sortField === "total") setSortAsc(v => !v);
                    else { setSortField("total"); setSortAsc(false); }
                  }}
                  title="Klik untuk mengurutkan total nominal"
                >
                  TOTAL {sortField === "total" && (sortAsc ? "▲" : "▼")}
                </th>
              </tr>
            </thead>
            <tbody>
              {displaySales.length ? (
                displaySales.map(s => {
                  const saleDateStr = getSaleDate(s);
                  const monthNamesShort: Record<string, string> = {
                    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
                    "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
                    "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
                  };
                  let dateText = s.created_at || "—";
                  if (saleDateStr && saleDateStr.length >= 10) {
                    const [y, m, d] = saleDateStr.split("-");
                    dateText = `${Number(d)} ${monthNamesShort[m] || m} ${y}`;
                  }

                  return (
                    <tr key={s.id}>
                      <td className="trx-code-col">
                        <strong>{s.invoice_no}</strong>
                        <small>{s.customer_name || s.notes || "Pendapatan jamu"}</small>
                      </td>
                      <td>{dateText}</td>
                      <td>
                        <span className="trx-status-pill">{s.status || "Tercatat"}</span>
                      </td>
                      <td className="trx-total-cell">
                        <div className="trx-total-wrap">
                          <span className="trx-amount">{money(s.total)}</span>
                          <button
                            type="button"
                            className="trx-detail-btn"
                            onClick={() => onViewDetail(s)}
                          >
                            Detail ↗
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "30px 20px", color: "#8a968b" }}>
                    Tidak ada transaksi pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* =========================================================================
   SETTINGS PAGE VIEW
   ========================================================================= */

function SettingsPageView({
  onExport,
  products,
  sales,
  configured
}: {
  onExport: () => void;
  products: Product[];
  sales: Sale[];
  configured: boolean;
}) {
  return (
    <div className="mid-split-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Status Penyimpanan Online</h2>
            <p>Koneksi database Jamu Herbal Gambirono</p>
          </div>
          <Settings size={18} style={{ color: "#7b8a7e" }} />
        </div>
        <div style={{ padding: "10px 20px 20px", fontSize: "11.5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className={`connection-dot ${configured ? "connected" : ""}`} />
            <div>
              <strong>{configured ? "Supabase Terhubung" : "Mode Penyimpanan Lokal"}</strong>
              <div style={{ fontSize: "10px", color: "#8a968b" }}>
                {configured ? "Data disimpan permanen di cloud." : "Data tersimpan di sesi browser untuk demo."}
              </div>
            </div>
          </div>
          <p style={{ color: "#78867a", lineHeight: 1.5 }}>
            Semua perubahan stok fisik (ml) dan pencatatan transaksi langsung tersinkronisasi.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Cadangan & Ekspor</h2>
            <p>Amankan salinan data usaha Anda</p>
          </div>
          <Download size={18} style={{ color: "#7b8a7e" }} />
        </div>
        <div style={{ padding: "10px 20px 20px" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, background: "#f8faf7", padding: "10px 14px", borderRadius: 8, border: "1px solid #e7eee5" }}>
              <span style={{ fontSize: "10px", color: "#8a968b" }}>Jumlah Barang</span>
              <strong style={{ display: "block", fontSize: "18px", color: "#255333" }}>{products.length}</strong>
            </div>
            <div style={{ flex: 1, background: "#f8faf7", padding: "10px 14px", borderRadius: 8, border: "1px solid #e7eee5" }}>
              <span style={{ fontSize: "10px", color: "#8a968b" }}>Jumlah Transaksi</span>
              <strong style={{ display: "block", fontSize: "18px", color: "#255333" }}>{sales.length}</strong>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: "100%" }} onClick={onExport}>
            <Download size={14} /> Unduh Cadangan CSV
          </button>
        </div>
      </section>
    </div>
  );
}
