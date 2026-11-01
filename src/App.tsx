import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, BarChart3, Calendar, Check, ClipboardList,
  Download, FileText, LayoutDashboard, Lock, Menu,
  Package, Plus, RefreshCw, RotateCcw, Search, Settings, ShoppingCart,
  Sprout, Trash2, TrendingUp, Unlock, X
} from "lucide-react";
import {
  createSale, deleteProduct, demoProducts, demoSales,
  getProducts, getSales, saveProduct, fetchStore,
  recordStocktake, authenticateOwnerApi, logoutOwnerApi,
  isSupabaseConfigured
} from "./lib/data";
import type { Product, Sale, ViewName } from "./types";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n || 0);

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
  "KCM",
  "ML"
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
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [sales, setSales] = useState<Sale[]>(demoSales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [showAddSale, setShowAddSale] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockCode, setUnlockCode] = useState("WISNU");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [pendingAction, setPendingAction] = useState<"addSale" | "dailyStock" | "quickStock" | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Modals
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    category: "Jamu Cair",
    unit: "BOTOL",
    buy_price: "5000",
    sell_price: "8000",
    stock: "10",
    min_stock: "3"
  });

  // Quick single stock editing
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockVal, setQuickStockVal] = useState<number>(0);

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

  // Transaction detail modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Cart & POS
  const [cart, setCart] = useState<{ product_id: string; qty: number; unit_price: number }[]>([]);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("Tunai");
  const [saleNotes, setSaleNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const store = await fetchStore();
      setProducts(sortProductsByOrder(store.products));
      setSales(store.sales);
      setIsLocked(!store.canEdit);
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

  const lowStock = products.filter(p => p.stock <= p.min_stock);
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
    if (isLocked) {
      setUnlockCode("");
      setUnlockError("Silakan masukkan kode akses pemilik (WISNU) untuk menambah barang.");
      setShowUnlockModal(true);
      return;
    }
    setEditingProduct(null);
    setProductDraft({
      name: "",
      sku: "",
      category: "Jamu Cair",
      unit: "BOTOL",
      buy_price: "5000",
      sell_price: "8000",
      stock: "10",
      min_stock: "3"
    });
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    if (isLocked) {
      setUnlockCode("");
      setUnlockError("Silakan masukkan kode akses pemilik (WISNU) untuk mengubah barang.");
      setShowUnlockModal(true);
      return;
    }
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

  // Quick single stock edit save
  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await recordStocktake({ [quickStockProduct.id]: Math.max(0, quickStockVal) });
      setNotice(`Stok ${quickStockProduct.sku || quickStockProduct.name} diperbarui menjadi ${quickStockVal} ${quickStockProduct.unit}.`);
      setQuickStockProduct(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui stok.");
    } finally {
      setSaving(false);
    }
  };

  // Open daily batch stock update
  const handleOpenDailyStock = () => {
    if (isLocked) {
      setPendingAction("dailyStock");
      setUnlockCode("WISNU");
      setUnlockError("Silakan masukkan kode akses pemilik (WISNU) untuk membuka form pengisian stok barang.");
      setShowUnlockModal(true);
      return;
    }
    const draft: Record<string, number | ""> = {};
    const statusDraft: Record<string, string> = {};
    products.forEach(p => {
      draft[p.id] = p.stock;
      statusDraft[p.id] = p.status || (p.stock <= p.min_stock ? "Stok menipis" : "Stok aman");
    });
    setDailyStockDraft(draft);
    setDailyStatusDraft(statusDraft);
    setDailyStockDate(getTodayIsoDate());
    setShowDailyStockModal(true);
  };

  const handleToggleAddSale = () => {
    if (isLocked) {
      setPendingAction("addSale");
      setUnlockCode("WISNU");
      setUnlockError("Silakan masukkan kode akses pemilik untuk membuka form pencatatan penjualan.");
      setShowUnlockModal(true);
      return;
    }
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
      setNotice("Stok dagangan harian berhasil diperbarui dan tersimpan di database.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui stok harian.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetup14Variants = async () => {
    if (isLocked) {
      setUnlockCode("");
      setUnlockError("Silakan masukkan kode akses pemilik (WISNU) untuk menyiapkan varian.");
      setShowUnlockModal(true);
      return;
    }
    const standardVariants = [
      { sku: "H", name: "Habba", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 10, min_stock: 3 },
      { sku: "KS", name: "Kunyit Sirih", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 12, min_stock: 3 },
      { sku: "SS", name: "Sirih Sereh", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 4, min_stock: 2 },
      { sku: "SP", name: "Sambiloto Pahit", unit: "BOTOL", buy_price: 6000, sell_price: 9000, stock: 10, min_stock: 3 },
      { sku: "M", name: "Mengkudu", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 7, min_stock: 2 },
      { sku: "K", name: "Kencur", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 4, min_stock: 2 },
      { sku: "O", name: "Olahan Temulawak", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 14, min_stock: 3 },
      { sku: "P", name: "Pahit", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 3, min_stock: 2 },
      { sku: "B", name: "Beras Kencur", unit: "BOTOL", buy_price: 5000, sell_price: 8000, stock: 3, min_stock: 2 },
      { sku: "HJ", name: "Herbal Jahe", unit: "BOTOL", buy_price: 6000, sell_price: 9000, stock: 7, min_stock: 2 },
      { sku: "PB", name: "Paitan Bersih", unit: "BOTOL", buy_price: 6000, sell_price: 9000, stock: 5, min_stock: 2 },
      { sku: "PLS", name: "Pegal Linu Super", unit: "BOTOL", buy_price: 6000, sell_price: 9000, stock: 3, min_stock: 2 },
      { sku: "DRT", name: "Darah Tinggi", unit: "BOTOL", buy_price: 7000, sell_price: 10000, stock: 3, min_stock: 2 },
      { sku: "KCM", name: "Kencing Manis", unit: "BOTOL", buy_price: 7000, sell_price: 10000, stock: 2, min_stock: 2 }
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
            ["Invoice", "Tanggal", "Keterangan/Pelanggan", "Pembayaran", "Status", "Total"],
            ...sales.map(s => [
              s.invoice_no,
              s.created_at,
              s.customer_name ?? "",
              s.payment_method,
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
            <span className="owner-pill">
              {isLocked ? "Mode terkunci" : "Mode pemilik"}
            </span>
            <button
              className={`lock-toggle-btn ${isLocked ? "is-locked" : ""}`}
              onClick={async () => {
                if (isLocked) {
                  setPendingAction(null);
                  setPendingProduct(null);
                  setUnlockCode("WISNU");
                  setUnlockError("");
                  setShowUnlockModal(true);
                } else {
                  try {
                    await logoutOwnerApi();
                    setIsLocked(true);
                    setNotice("Mode pemilik berhasil dikunci.");
                    await refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal mengunci sesi.");
                  }
                }
              }}
              title={isLocked ? "Buka mode pemilik (kode: WISNU)" : "Kunci mode pemilik"}
            >
              {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
              <span>{isLocked ? "Buka" : "Kunci"}</span>
            </button>
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
                  Catat jumlah stok yang tersedia dalam BOTOL. Penjualan tidak mengubah stok.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleOpenDailyStock}
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

          {/* VIEW: DASHBOARD (RINGKASAN) */}
          {view === "dashboard" && (
            <DashboardView
              products={products}
              sales={sales}
              totalMonthRevenue={totalMonthRevenue}
              yesterdayRevenue={yesterdayRevenue}
              currentDate={currentDate}
              onNavigate={setView}
              onOpenCatatPenjualan={handleToggleAddSale}
              onQuickEditStock={p => {
                if (isLocked) {
                  setUnlockCode("");
                  setUnlockError("Silakan masukkan kode akses pemilik (WISNU) untuk mengubah stok barang.");
                  setShowUnlockModal(true);
                  return;
                }
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
              onSetupVariants={handleSetup14Variants}
              onAddVariant={openNewProduct}
              onEdit={openEditProduct}
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
                <h2>Perbarui Stok: {quickStockProduct.sku || quickStockProduct.name}</h2>
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

            <div style={{ padding: "12px 0 20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#4f6052", marginBottom: 8 }}>
                Jumlah Stok Tersedia Saat Ini
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 44, height: 44, fontSize: 18 }}
                  onClick={() => setQuickStockVal(v => Math.max(0, v - 1))}
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
                    border: "1px solid #dce4da",
                    borderRadius: 8
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 44, height: 44, fontSize: 18 }}
                  onClick={() => setQuickStockVal(v => v + 1)}
                >
                  +
                </button>
              </div>
              <p style={{ fontSize: "10px", color: "#8a968b", marginTop: 8 }}>
                Batas minimum peringatan: {quickStockProduct.min_stock} {quickStockProduct.unit}
              </p>
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
              >
                Simpan Stok
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
                Isi sisa stok aktual setiap varian. Kosongkan untuk melewati varian; masukkan 0 jika habis. Satuan default: BOTOL. Masukkan jumlah botol yang tersedia.
              </p>

              <div className="daily-stock-grid">
                {sortProductsByOrder(products).map(p => {
                  const label = `${p.sku || p.code || p.name} (${p.unit})`;
                  const currentVal = dailyStockDraft[p.id];
                  const currentStatus =
                    dailyStatusDraft[p.id] ||
                    (currentVal !== undefined && Number(currentVal) <= p.min_stock
                      ? "Stok menipis"
                      : p.status || "Stok aman");

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

            <div className="modal-actions">
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

      {/* MODAL: Buka Mode Pemilik (Kode: WISNU) */}
      {showUnlockModal && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowUnlockModal(false);
          }}
        >
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">AKSES PEMILIK TOKO</p>
                <h2>Buka Mode Pemilik</h2>
                <p>Masukkan kode akses untuk mengisi transaksi dan stok barang.</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowUnlockModal(false)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const trimmed = unlockCode.trim();
                if (!trimmed) return;
                setUnlocking(true);
                setUnlockError("");
                try {
                  await authenticateOwnerApi(trimmed);
                  setIsLocked(false);
                  setShowUnlockModal(false);
                  setNotice("Mode pemilik berhasil dibuka. Anda sekarang dapat mengisi transaksi dan stok barang.");
                  await refresh();

                  // Langsung masuk ke form yang dituju pengguna
                  if (pendingAction === "addSale") {
                    setShowAddSale(true);
                  } else if (pendingAction === "dailyStock") {
                    const draft: Record<string, number | ""> = {};
                    const statusDraft: Record<string, string> = {};
                    products.forEach(p => {
                      draft[p.id] = p.stock;
                      statusDraft[p.id] = p.status || (p.stock <= p.min_stock ? "Stok menipis" : "Stok aman");
                    });
                    setDailyStockDraft(draft);
                    setDailyStatusDraft(statusDraft);
                    setDailyStockDate(getTodayIsoDate());
                    setShowDailyStockModal(true);
                  } else if (pendingAction === "quickStock" && pendingProduct) {
                    setQuickStockProduct(pendingProduct);
                    setQuickStockVal(pendingProduct.stock);
                  }
                  setPendingAction(null);
                  setPendingProduct(null);
                } catch (err) {
                  setUnlockError(err instanceof Error ? err.message : "Kode akses salah. Silakan coba lagi.");
                } finally {
                  setUnlocking(false);
                }
              }}
              style={{ padding: "16px 20px 20px" }}
            >
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 8, display: "block" }}>
                  Kode Akses Pemilik
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Contoh: WISNU"
                    value={unlockCode}
                    onChange={e => setUnlockCode(e.target.value)}
                    autoFocus
                    style={{
                      fontSize: 16,
                      letterSpacing: 2,
                      textAlign: "center",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      flex: 1
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ whiteSpace: "nowrap", padding: "8px 12px", height: "auto" }}
                    onClick={() => setUnlockCode("Masukan Kode Akses")}
                    title="Gunakan kode Akses"
                  >
                    Gunakan Kode Akses
                  </button>
                </div>
                <p style={{ fontSize: "11px", color: "#7a8a7c", marginTop: 6 }}>
                  Petunjuk: Masukkan kode akses untuk mengaktifkan mode admin.
                </p>
              </div>

              {unlockError && (
                <div className="alert alert-error" style={{ marginBottom: 16, fontSize: "11.5px" }}>
                  <AlertTriangle size={15} />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="modal-actions" style={{ padding: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUnlockModal(false);
                    setPendingAction(null);
                    setPendingProduct(null);
                  }}
                  disabled={unlocking}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={unlocking || !unlockCode.trim()}
                >
                  {unlocking ? "Memverifikasi…" : "Buka Mode Pemilik & Lanjutkan"}
                </button>
              </div>
            </form>
          </div>
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
  onSuccess,
  onCancel
}: {
  onSuccess: (msg: string) => void;
  onCancel?: () => void;
}) {
  const [tanggal, setTanggal] = useState(() => getTodayIsoDate());
  const [amount, setAmount] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setFormError("Masukkan jumlah pendapatan yang valid (lebih dari 0).");
      return;
    }
    setSaving(true);
    try {
      await createSale({
        total: num,
        date: tanggal,
        tanggal: tanggal,
        customer_name: catatan.trim() || "Pendapatan jamu",
        notes: catatan.trim() || "Pendapatan transaksi jamu",
        payment_method: "Tunai",
        items: []
      });
      setAmount("");
      setCatatan("");
      onSuccess(`Pendapatan transaksi sebesar ${money(num)} berhasil dicatat.`);
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
        <h2>Catat penjualan</h2>
        <p className="subtitle">
          Catat pendapatan transaksi jamu. Tidak perlu memasukkan campuran varian.
        </p>
      </div>

      {formError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertTriangle size={15} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="catat-form-grid">
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
              type="number"
              className="field-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Contoh: 10000"
              min="1"
              required
            />
          </div>
        </div>

        <div className="field-group" style={{ marginTop: 16 }}>
          <label className="field-label">Catatan (opsional)</label>
          <input
            type="text"
            className="field-input"
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Contoh: Jamu campur 200 ml"
          />
        </div>

        <div className="catat-info-notice">
          Stok tidak berkurang saat transaksi disimpan. Perbarui sisa stok melalui menu Barang & stok.
        </div>

        <div className="catat-form-actions">
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
            {saving ? "Menyimpan…" : "Simpan pendapatan"}
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
      <section className="metrics-row">
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
            const isWarning = p.stock <= p.min_stock;
            const statusText = p.status || (isWarning ? "Stok menipis" : "Stok aman");
            const statusClass = statusText.toLowerCase().includes("menipis") || isWarning ? "warning" : "safe";
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
                    {p.last_updated || todayIso}
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
                <small>Isi sisa stok dalam BOTOL</small>
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
  onSetupVariants,
  onAddVariant,
  onEdit
}: {
  products: Product[];
  onSetupVariants: () => void;
  onAddVariant: () => void;
  onEdit: (p: Product) => void;
}) {
  return (
    <section className="inventory-panel">
      <div className="inventory-actions-bar">
        <button
          type="button"
          className="btn-variant-pill"
          onClick={onSetupVariants}
        >
          Siapkan 14 varian jamu
        </button>
        <button
          type="button"
          className="btn-variant-pill"
          onClick={onAddVariant}
        >
          + Tambah varian
        </button>
      </div>

      <div className="inventory-stock-grid">
        {sortProductsByOrder(products).map(p => {
          const isWarning = p.stock <= p.min_stock;
          const statusText = p.status || (isWarning ? "Stok menipis" : "Stok aman");
          const statusClass = statusText.toLowerCase().includes("menipis") || isWarning ? "warning" : "safe";
          const displayCode = p.sku || p.code || p.name;
          const displayDate = p.last_updated || "26 Okt 2026";

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
                <span className="inv-card-qty">{p.stock}</span>
                <span className="inv-card-unit">{p.unit}</span>
              </div>
              <div className="inv-card-footer">
                <span className="inv-card-date">{displayDate}</span>
                <button
                  type="button"
                  className="inv-edit-link"
                  onClick={() => onEdit(p)}
                >
                  Edit ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
            <p>Pilih botol / produk untuk ditambahkan ke transaksi</p>
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
  onExport,
  onViewDetail
}: {
  sales: Sale[];
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
  const validSales = filteredSales.filter(s => s.status !== "Dibatalkan");
  const cancelledSales = filteredSales.filter(s => s.status === "Dibatalkan");

  const totalPenjualan = validSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const transaksiTercatat = validSales.length;
  const transaksiDibatalkan = cancelledSales.length;

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

      {/* 3 KPI Cards */}
      <div className="report-kpi-grid">
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
            <span className="report-kpi-label">Transaksi tercatat</span>
            <div className="report-kpi-badge">
              <FileText size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{transaksiTercatat}</div>
          <div className="report-kpi-footer">Transaksi yang sah</div>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <span className="report-kpi-label">Transaksi dibatalkan</span>
            <div className="report-kpi-badge">
              <RotateCcw size={13} />
            </div>
          </div>
          <div className="report-kpi-value">{transaksiDibatalkan}</div>
          <div className="report-kpi-footer">Tidak dihitung dalam pendapatan</div>
        </div>
      </div>

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
            Semua perubahan stok botol dan pencatatan transaksi langsung tersinkronisasi.
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
