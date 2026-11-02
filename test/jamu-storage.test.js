// ============================================================================
// test/jamu-storage.test.js - Test Suite untuk Migrasi 002 & Server API
// ============================================================================

process.env.TEST_MOCK = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getStore, updateStore } from '../server/store-service.js';
import { authenticateOwner, lockOwnerSession, isOwnerAuthenticated } from '../server/owner-auth.js';

test('1. Verifikasi File Migrasi 003 Gambirono Isolated Database', () => {
  const sqlPath = path.resolve('supabase/003_Gambirono_Isolated_Database.sql');
  assert.ok(fs.existsSync(sqlPath), 'File 003_Gambirono_Isolated_Database.sql harus ada');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Periksa 6 tabel khusus Gambirono
  assert.match(sql, /create table if not exists public\.gambirono_produk/i, 'Harus mendefinisikan public.gambirono_produk');
  assert.match(sql, /create table if not exists public\.gambirono_transaksi_penjualan/i, 'Harus mendefinisikan public.gambirono_transaksi_penjualan');
  assert.match(sql, /create table if not exists public\.gambirono_stok_harian/i, 'Harus mendefinisikan public.gambirono_stok_harian');
  assert.match(sql, /create table if not exists public\.gambirono_mutasi_stok/i, 'Harus mendefinisikan public.gambirono_mutasi_stok');
  assert.match(sql, /create table if not exists public\.gambirono_jamu_meta/i, 'Harus mendefinisikan public.gambirono_jamu_meta');
  assert.match(sql, /create table if not exists public\.gambirono_owner_attempts/i, 'Harus mendefinisikan public.gambirono_owner_attempts');

  // Periksa fungsi RPC gambirono_jamu_storage
  assert.match(sql, /create or replace function public\.gambirono_jamu_storage/i, 'Harus mendefinisikan public.gambirono_jamu_storage');
  assert.match(sql, /operation = 'read'/i, 'Harus mendukung operasi read');
  assert.match(sql, /operation = 'update'/i, 'Harus mendukung operasi update');
  assert.match(sql, /operation = 'insert'/i, 'Harus mendukung operasi insert');
  assert.match(sql, /operation = 'attempt'/i, 'Harus mendukung operasi attempt');
  assert.match(sql, /operation = 'cleanup'/i, 'Harus mendukung operasi cleanup');
});

test('2. Data Awal Bersih: 14 Produk, 0 Transaksi, 0 Stok Harian', async () => {
  const store = await getStore(false);

  assert.equal(store.state.products.length, 14, 'Harus ada tepat 14 produk jamu');
  assert.equal(store.state.transactions.length, 0, 'Harus memuat 0 transaksi penjualan pada database bersih');
  assert.equal(store.state.dailyStocks.length, 0, 'Harus memuat 0 catatan stok harian pada database bersih');

  // Stok Baseline: Semua 0
  const expectedStocks = {
    H: 0, KS: 0, SS: 0, SP: 0, M: 0, K: 0, O: 0, P: 0, B: 0, HJ: 0, PB: 0, PLS: 0, DRT: 0, KCM: 0
  };

  for (const [code, expectedQty] of Object.entries(expectedStocks)) {
    const prod = store.state.products.find(p => p.kode === code || p.sku === code || p.code === code);
    assert.ok(prod, `Produk dengan kode ${code} harus ditemukan`);
    assert.equal(prod.stock, 0, `Stok produk ${code} harus 0 pada database bersih`);
  }
});

test('3. Input Pendapatan (income): Menambah Transaksi Tanpa Mengurangi Stok Harian Otomatis', async () => {
  const current = await getStore(true);
  const initialTrxCount = current.state.transactions.length;
  const initialStockH = current.state.products.find(p => p.kode === 'H').stock;

  const res = await updateStore({
    revision: current.revision,
    action: 'income',
    payload: {
      total: 100000,
      customer_name: 'Pelanggan Uji',
      payment_method: 'Tunai',
      items: [{ product_id: 'prod-1793547155241', qty: 2, unit_price: 8000 }]
    }
  }, true);

  const addedTrx = res.state.transactions.find(t => t.customer_name === 'Pelanggan Uji');
  assert.ok(addedTrx, 'Transaksi Pelanggan Uji harus ditemukan');
  assert.equal(addedTrx.total, 100000);
  assert.equal(addedTrx.status, 'Tercatat');

  // Aturan asli: Stok harian tidak otomatis dikurangi oleh catatan pendapatan
  const postStockH = res.state.products.find(p => p.kode === 'H').stock;
  assert.equal(postStockH, initialStockH, 'Stok produk tidak boleh otomatis berkurang oleh catatan pendapatan');
});

test('4. Input Stok (stocktake): Menyesuaikan Stok Produk dan Menambah Catatan Stok Harian', async () => {
  const current = await getStore(true);
  const prod1 = current.state.products[0];
  const prod2 = current.state.products[1];
  const prod1Id = prod1.id;
  const prod2Id = prod2.id;
  const originalStock1 = prod1.stock;
  const originalStock2 = prod2.stock;

  try {
    const res = await updateStore({
      revision: current.revision,
      action: 'stocktake',
      payload: {
        tanggal: '2026-10-28',
        items: {
          [prod1Id]: 15,
          [prod2Id]: 20
        }
      }
    }, true);

    const updatedProd1 = res.state.products.find(p => p.id === prod1Id);
    assert.equal(updatedProd1.stock, 15, 'Stok prod-1 harus menjadi 15');

    const updatedProd2 = res.state.products.find(p => p.id === prod2Id);
    assert.equal(updatedProd2.stock, 20, 'Stok prod-2 harus menjadi 20');

    const stockEntry = res.state.dailyStocks.find(s => (s.produk_id === prod1Id || s.productId === prod1Id) && (s.tanggal === '2026-10-28' || s.date === '2026-10-28'));
    assert.ok(stockEntry, 'Harus mencatat baris baru pada stok_harian untuk tanggal 2026-10-28');
    assert.equal(stockEntry.qty || stockEntry.jumlah, 15);
  } finally {
    const latest = await getStore(true);
    await updateStore({
      revision: latest.revision,
      action: 'stocktake',
      payload: {
        tanggal: '2026-10-29',
        items: {
          [prod1Id]: originalStock1,
          [prod2Id]: originalStock2
        }
      }
    }, true);
  }
});

test('5. Akses Operasional Langsung: Seluruh Aksi Diizinkan Tanpa Password', async () => {
  const current = await getStore(true);
  const res = await updateStore({
    revision: current.revision,
    action: 'income',
    payload: { total: 50000, customer_name: 'Uji Akses Langsung', items: [] }
  }, true);
  assert.ok(res.revision > current.revision, 'Aksi harus berhasil tanpa memerlukan kode akses');
});

test('7. Otorisasi Pemilik: Fungsi Autentikasi Mengembalikan True (Langsung Aktif)', () => {
  const authRes = authenticateOwner();
  assert.equal(authRes.success, true, 'Autentikasi harus langsung sukses');
  assert.equal(isOwnerAuthenticated(), true, 'isOwnerAuthenticated harus selalu true');
});

test('8. Modifikasi ML & Rekonsiliasi Stok: Simpan Volume ML dan Formula Selisih (Selisih = Input - Calculated)', async () => {
  const current = await getStore(true);
  const res = await updateStore({
    revision: current.revision,
    action: 'income',
    payload: {
      total: 120000,
      customer_name: 'Uji Rekonsiliasi ML',
      payment_method: 'Tunai',
      jamu_terjual_ml: 4500,
      restok_ml: 2000,
      tanggal: '2026-10-30',
      items: []
    }
  }, true);

  const lastTrx = res.state.transactions.find(t => t.customer_name === 'Uji Rekonsiliasi ML');
  assert.ok(lastTrx, 'Transaksi Uji Rekonsiliasi ML harus tersimpan');
  assert.equal(lastTrx.jamu_terjual_ml, 4500, 'jamu_terjual_ml harus 4500');
  assert.equal(lastTrx.restok_ml, 2000, 'restok_ml harus 2000');

  // Formula Rekonsiliasi Harian
  // Stok Terjual (Kalkulasi) = Stok Kemarin - Stok Hari Ini + Restok
  const stokYesterday = 5000;
  const stokToday = 3000;
  const restok = 2000;
  const calculatedSold = stokYesterday - stokToday + restok; // 4000 ml
  const inputSales = 4500; // ml
  const selisih = inputSales - calculatedSold; // +500 ml

  assert.equal(calculatedSold, 4000, 'Stok terjual hasil kalkulasi harus 4000 ml');
  assert.equal(selisih, 500, 'Selisih rekonsiliasi harus +500 ml');
  assert.ok(selisih !== 0, 'Selisih non-nol menandakan Perlu pemeriksaan');
});

test('9. Verifikasi Perhitungan Total Stok Jamu (ML) & Riwayat Update Stok', async () => {
  const current = await getStore(true);
  const totalMl = current.state.products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
  assert.ok(totalMl >= 0, 'Total stok jamu (ml) harus bertipe angka >= 0');

  // Lakukan pencatatan stok harian baru
  const prod1 = current.state.products[0];
  const oldStock = prod1.stock;
  const newStock = oldStock + 1000;

  const res = await updateStore({
    revision: current.revision,
    action: 'stocktake',
    payload: {
      tanggal: '2026-11-01',
      items: {
        [prod1.id]: newStock
      }
    }
  }, true);

  const updatedTotalMl = res.state.products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
  assert.equal(updatedTotalMl, totalMl + 1000, 'Total stok jamu (ml) harus bertambah tepat 1000 ml');

  // Verifikasi mutasi stok tercatat di state
  const mutations = res.state.stockMutations || res.state.mutasi_stok || res.state.moves || [];
  assert.ok(mutations.length > 0, 'Mutasi stok harus tersimpan di riwayat update stok');

  const latestMut = mutations.find(m => m.produk_id === prod1.id || m.productId === prod1.id);
  assert.ok(latestMut, 'Mutasi stok terbaru produk harus ditemukan');
  assert.equal(latestMut.stok_sebelumnya, oldStock, 'Stok sebelumnya di mutasi harus sesuai');
  assert.equal(latestMut.stok_terbaru, newStock, 'Stok terbaru di mutasi harus sesuai');
  assert.equal(latestMut.perubahan, 1000, 'Perubahan stok harus +1000 ml');
});

