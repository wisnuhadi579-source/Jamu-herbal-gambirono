import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, initialSchema1State, DEFAULT_PRODUCTS, getPreviousIsoDate } from '../server/core.js';

// Helper function implementing the exact isolated reconciliation calculation logic
function computeDailyReconciliation({
  targetDate,
  sales,
  dailyStocks,
  products
}) {
  const prevDate = getPreviousIsoDate(targetDate);
  const activeProducts = products.filter(p => p.aktif !== false);
  const requiredCount = activeProducts.length || 14;

  const getStockInfo = (date) => {
    const entries = dailyStocks.filter(s => (s.tanggal === date || s.date === date));
    if (entries.length === 0) return { total: null, isComplete: false, count: 0 };
    const prodMap = new Map();
    entries.forEach(item => {
      const key = item.produk_id || item.productId || item.id;
      const matched = products.find(p => p.id === key || p.sku === key || p.kode === key);
      const resolvedId = matched ? matched.id : String(key);
      const qty = Number(item.jumlah !== undefined ? item.jumlah : (item.qty !== undefined ? item.qty : item.stock) || 0);
      prodMap.set(resolvedId, qty);
    });
    const total = Array.from(prodMap.values()).reduce((sum, v) => sum + v, 0);
    return {
      total,
      isComplete: prodMap.size >= requiredCount,
      count: prodMap.size
    };
  };

  const infoToday = getStockInfo(targetDate);
  const infoYesterday = getStockInfo(prevDate);
  const hasBothDates = infoToday.total !== null && infoYesterday.total !== null;
  const isComplete = hasBothDates && infoToday.isComplete && infoYesterday.isComplete;

  const daySales = sales.filter(s => {
    const sDate = s.tanggal || s.date;
    return sDate === targetDate && s.status !== 'Dibatalkan' && s.status !== 'Batal';
  });

  const inputSales = daySales.reduce((sum, s) => sum + Number(s.jamu_terjual_ml || 0), 0);
  const restok = daySales.reduce((sum, s) => sum + Number(s.restok_ml || 0), 0);

  let calculatedSold = null;
  let diff = null;

  if (isComplete) {
    calculatedSold = (infoYesterday.total - infoToday.total) + restok;
    diff = inputSales - calculatedSold;
  }

  return {
    targetDate,
    prevDate,
    hasStockData: isComplete,
    isComplete,
    stokYesterday: infoYesterday.total,
    stokToday: infoToday.total,
    restok,
    inputSales,
    calculatedSold,
    diff
  };
}

// Helper function implementing the monthly reconciliation calculation logic
function computeMonthlyReconciliation({
  targetMonth,
  sales,
  dailyStocks,
  products
}) {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();

  const activeProducts = products.filter(p => p.aktif !== false);
  const requiredCount = activeProducts.length || 14;

  const getStockInfo = (date) => {
    const entries = dailyStocks.filter(s => (s.tanggal === date || s.date === date));
    if (entries.length === 0) return { total: null, isComplete: false, count: 0 };
    const prodMap = new Map();
    entries.forEach(item => {
      const key = item.produk_id || item.productId || item.id;
      const matched = products.find(p => p.id === key || p.sku === key || p.kode === key);
      const resolvedId = matched ? matched.id : String(key);
      const qty = Number(item.jumlah !== undefined ? item.jumlah : (item.qty !== undefined ? item.qty : item.stock) || 0);
      prodMap.set(resolvedId, qty);
    });
    const total = Array.from(prodMap.values()).reduce((sum, v) => sum + v, 0);
    return {
      total,
      isComplete: prodMap.size >= requiredCount,
      count: prodMap.size
    };
  };

  const monthSales = sales.filter(s => {
    const d = s.tanggal || s.date;
    return d && d.startsWith(targetMonth) && s.status !== 'Dibatalkan' && s.status !== 'Batal';
  });
  const inputSales = monthSales.reduce((sum, s) => sum + Number(s.jamu_terjual_ml || 0), 0);

  let accumulatedCalculatedSold = 0;
  let validDaysCount = 0;
  const missingDays = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = String(day).padStart(2, '0');
    const currIso = `${yearStr}-${monthStr}-${dStr}`;
    const prevIso = getPreviousIsoDate(currIso);

    const daySales = sales.filter(s => (s.tanggal === currIso || s.date === currIso) && s.status !== 'Dibatalkan' && s.status !== 'Batal');
    const dayRestok = daySales.reduce((sum, s) => sum + Number(s.restok_ml || 0), 0);

    const infoToday = getStockInfo(currIso);
    const infoYesterday = getStockInfo(prevIso);

    if (infoToday.isComplete && infoYesterday.isComplete) {
      const dayCalc = (infoYesterday.total - infoToday.total) + dayRestok;
      accumulatedCalculatedSold += dayCalc;
      validDaysCount++;
    } else {
      missingDays.push(currIso);
    }
  }

  const isComplete = missingDays.length === 0 && validDaysCount > 0;
  const diff = inputSales - accumulatedCalculatedSold;

  return {
    targetMonth,
    inputSales,
    calculatedSold: accumulatedCalculatedSold,
    diff,
    validDaysCount,
    isComplete,
    missingDays
  };
}

test('Rekonsiliasi Stok dan Penjualan Jamu Filters Tests', async (t) => {
  const products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));

  await t.test('1. Date predecessor logic: 1 Nov 2026 compares against 31 Oct 2026', () => {
    assert.equal(getPreviousIsoDate('2026-11-01'), '2026-10-31');
    assert.equal(getPreviousIsoDate('2026-11-02'), '2026-11-01');
    assert.equal(getPreviousIsoDate('2026-11-03'), '2026-11-02');
  });

  await t.test('2. Case 1 validation: Stok kemarin 14.950 ml, stok hari ini 14.550 ml, restok 0 ml yields 400 ml', () => {
    const today = '2026-11-03';
    const yesterday = '2026-11-02';

    // Populate dailyStocks for 14 products yesterday totaling 14950
    // and 14 products today totaling 14550
    const dailyStocks = [];
    products.forEach((p, idx) => {
      // 13 products with 1000, 14th product with remaining
      const qYesterday = idx < 13 ? 1000 : (14950 - 13000); // 1950
      const qToday = idx < 13 ? 1000 : (14550 - 13000); // 1550
      dailyStocks.push({ produk_id: p.id, tanggal: yesterday, jumlah: qYesterday });
      dailyStocks.push({ produk_id: p.id, tanggal: today, jumlah: qToday });
    });

    const sales = [
      { id: 'trx-1', tanggal: today, jamu_terjual_ml: 450, restok_ml: 0, status: 'Tercatat' }
    ];

    const res = computeDailyReconciliation({ targetDate: today, sales, dailyStocks, products });
    assert.strictEqual(res.isComplete, true);
    assert.strictEqual(res.stokYesterday, 14950);
    assert.strictEqual(res.stokToday, 14550);
    assert.strictEqual(res.restok, 0);
    assert.strictEqual(res.calculatedSold, 400); // 14950 - 14550 + 0 = 400
    assert.strictEqual(res.inputSales, 450);
    assert.strictEqual(res.diff, 50); // 450 - 400 = +50 (Input karyawan lebih besar)
  });

  await t.test('3. Case 2 validation: Filter Pilih Tanggal 2 Nov uses strictly 1 Nov and 2 Nov data without 3 Nov', () => {
    const nov1 = '2026-11-01';
    const nov2 = '2026-11-02';
    const nov3 = '2026-11-03';

    const dailyStocks = [];
    products.forEach(p => {
      dailyStocks.push({ produk_id: p.id, tanggal: nov1, jumlah: 1000 }); // Total 14.000
      dailyStocks.push({ produk_id: p.id, tanggal: nov2, jumlah: 900 });  // Total 12.600
      dailyStocks.push({ produk_id: p.id, tanggal: nov3, jumlah: 500 });  // Should be ignored
    });

    const sales = [
      { id: 's-nov1', tanggal: nov1, jamu_terjual_ml: 9999, restok_ml: 0, status: 'Tercatat' }, // Ignored
      { id: 's-nov2', tanggal: nov2, jamu_terjual_ml: 1400, restok_ml: 0, status: 'Tercatat' },
      { id: 's-nov3', tanggal: nov3, jamu_terjual_ml: 8888, restok_ml: 0, status: 'Tercatat' }  // Ignored
    ];

    const res = computeDailyReconciliation({ targetDate: nov2, sales, dailyStocks, products });
    assert.strictEqual(res.targetDate, nov2);
    assert.strictEqual(res.prevDate, nov1);
    assert.strictEqual(res.stokYesterday, 14000);
    assert.strictEqual(res.stokToday, 12600);
    assert.strictEqual(res.calculatedSold, 1400); // 14000 - 12600 + 0 = 1400
    assert.strictEqual(res.inputSales, 1400);
    assert.strictEqual(res.diff, 0); // Exactly sesuai
  });

  await t.test('4. Cancelled sales (Batal / Dibatalkan) are strictly excluded from reconciliation', () => {
    const today = '2026-11-03';
    const yesterday = '2026-11-02';

    const dailyStocks = [];
    products.forEach(p => {
      dailyStocks.push({ produk_id: p.id, tanggal: yesterday, jumlah: 1000 });
      dailyStocks.push({ produk_id: p.id, tanggal: today, jumlah: 800 });
    });

    const sales = [
      { id: 's-valid', tanggal: today, jamu_terjual_ml: 2800, restok_ml: 0, status: 'Tercatat' },
      { id: 's-cancelled', tanggal: today, jamu_terjual_ml: 5000, restok_ml: 1000, status: 'Dibatalkan' },
      { id: 's-batal', tanggal: today, jamu_terjual_ml: 3000, restok_ml: 500, status: 'Batal' }
    ];

    const res = computeDailyReconciliation({ targetDate: today, sales, dailyStocks, products });
    assert.strictEqual(res.restok, 0, 'Cancelled restok must be ignored');
    assert.strictEqual(res.inputSales, 2800, 'Cancelled sales must be ignored');
    assert.strictEqual(res.calculatedSold, 2800); // 14*1000 - 14*800 = 14000 - 11200 = 2800
    assert.strictEqual(res.diff, 0);
  });

  await t.test('5. Incomplete stock data marks reconciliation as incomplete and does not fake zeroes', () => {
    const today = '2026-11-03';
    const yesterday = '2026-11-02';

    // Only 10 of 14 products recorded on today
    const dailyStocks = [];
    products.slice(0, 10).forEach(p => {
      dailyStocks.push({ produk_id: p.id, tanggal: today, jumlah: 1000 });
    });
    // Yesterday has all 14 products
    products.forEach(p => {
      dailyStocks.push({ produk_id: p.id, tanggal: yesterday, jumlah: 1000 });
    });

    const res = computeDailyReconciliation({ targetDate: today, sales: [], dailyStocks, products });
    assert.strictEqual(res.isComplete, false, 'Must be marked incomplete when less than 14 products');
    assert.strictEqual(res.calculatedSold, null, 'Must not compute calculatedSold when incomplete');
  });

  await t.test('6. Monthly reconciliation: accumulates daily reconciliations and uses 31 Oct for 1 Nov', () => {
    const oct31 = '2026-10-31';
    const nov1 = '2026-11-01';
    const nov2 = '2026-11-02';

    const dailyStocks = [];
    // Oct 31: 14 * 1000 = 14.000 ml
    products.forEach(p => dailyStocks.push({ produk_id: p.id, tanggal: oct31, jumlah: 1000 }));
    // Nov 1: 14 * 900 = 12.600 ml -> day 1 calc: 14.000 - 12.600 = 1.400 ml
    products.forEach(p => dailyStocks.push({ produk_id: p.id, tanggal: nov1, jumlah: 900 }));
    // Nov 2: 14 * 850 = 11.900 ml -> day 2 calc: 12.600 - 11.900 = 700 ml
    products.forEach(p => dailyStocks.push({ produk_id: p.id, tanggal: nov2, jumlah: 850 }));

    const sales = [
      { id: 's-1', tanggal: nov1, jamu_terjual_ml: 1400, restok_ml: 0, status: 'Tercatat' },
      { id: 's-2', tanggal: nov2, jamu_terjual_ml: 700, restok_ml: 0, status: 'Tercatat' }
    ];

    const monthlyRes = computeMonthlyReconciliation({ targetMonth: '2026-11', sales, dailyStocks, products });
    // Day 1: 1400, Day 2: 700. Total = 2100 ml
    assert.strictEqual(monthlyRes.validDaysCount, 2);
    assert.strictEqual(monthlyRes.calculatedSold, 2100);
    assert.strictEqual(monthlyRes.inputSales, 2100);
    assert.strictEqual(monthlyRes.diff, 0);
    assert.strictEqual(monthlyRes.isComplete, false); // Rest of the month has missing days -> partial!
  });
});
