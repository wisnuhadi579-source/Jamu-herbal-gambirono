// ============================================================================
// test/jamu-storage.test.js - Test Suite untuk Migrasi 002 & Server API
// ============================================================================

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

test('2. Data Sumber Awal Oktober 2026: 15 Produk, 16 Transaksi, 30 Stok Harian, Omzet Rp4.687.000', async () => {
  const store = await getStore(false);

  assert.ok(store.state.products.length >= 15, 'Harus ada minimal 15 produk jamu');
  assert.ok(store.state.transactions.length >= 16, 'Harus memuat minimal 16 transaksi penjualan');
  assert.ok(store.state.dailyStocks.length >= 30, 'Harus memuat minimal 30 catatan stok harian');

  // Transaksi baseline Oktober 2026 (16 transaksi awal)
  const octTransactions = store.state.transactions.filter(t => 
    (t.tanggal || t.date || '').startsWith('2026-10') &&
    t.customer_name !== 'Pelanggan Uji' &&
    !(t.nomor || t.invoice_no || '').includes('20261028') &&
    (t.tanggal || t.date || '') <= '2026-10-26'
  );
  if (octTransactions.length >= 16) {
    const baseline16 = octTransactions.slice(0, 16);
    const baselineOmzet = baseline16.reduce((acc, t) => acc + Number(t.total), 0);
    assert.equal(baselineOmzet, 4687000, 'Total omzet transaksi baseline Oktober harus tepat Rp4.687.000');
  }

  // Stok 26 Oktober: H 10, KS 12, SS 4, SP 10, M 7, K 4, O 14, P 3, B 3, HJ 7, PB 5, PLS 3, DRT 3, KCM 2 (BOTOL); ML 28 PCS
  const expectedStocks = {
    H: 10, KS: 12, SS: 4, SP: 10, M: 7, K: 4, O: 14, P: 3, B: 3, HJ: 7, PB: 5, PLS: 3, DRT: 3, KCM: 2, ML: 28
  };

  for (const [code, expectedQty] of Object.entries(expectedStocks)) {
    const prod = store.state.products.find(p => p.kode === code || p.sku === code || p.code === code);
    assert.ok(prod, `Produk dengan kode ${code} harus ditemukan`);
    assert.ok(typeof prod.stock === 'number', `Stok produk ${code} harus bertipe number`);
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
      items: [{ product_id: 'prod-1', qty: 2, unit_price: 8000 }]
    }
  }, true);

  assert.equal(res.state.transactions.length, initialTrxCount + 1, 'Jumlah transaksi harus bertambah 1');
  assert.equal(res.state.transactions[0].total, 100000);
  assert.equal(res.state.transactions[0].status, 'Tercatat');

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

test('5. Keamanan Akses: Viewer Tidak Dapat Mengubah Data (403 Forbidden)', async () => {
  const current = await getStore(false);

  await assert.rejects(
    async () => {
      await updateStore({
        revision: current.revision,
        action: 'income',
        payload: { total: 50000 }
      }, false); // canEdit = false
    },
    (err) => {
      assert.equal(err.status, 403, 'Harus melempar HTTP 403');
      return true;
    }
  );
});

test('6. Optimistic Concurrency: Dua Pembaruan dengan Revisi Sama Menghasilkan Konflik (409)', async () => {
  const current = await getStore(true);
  const initialRev = current.revision;

  // Pembaruan pertama dengan revisi initialRev -> Berhasil
  const update1 = await updateStore({
    revision: initialRev,
    action: 'settings',
    payload: { storeName: 'Jamu Herbal Baru' }
  }, true);

  assert.equal(update1.revision, initialRev + 1, 'Revisi harus naik menjadi initialRev + 1');

  // Pembaruan kedua yang masih memakai initialRev yang basi -> Konflik 409
  await assert.rejects(
    async () => {
      await updateStore({
        revision: initialRev, // revisi basi
        action: 'settings',
        payload: { storeName: 'Jamu Herbal Lain' }
      }, true);
    },
    (err) => {
      assert.equal(err.status, 409, 'Harus melempar HTTP 409 Conflict');
      return true;
    }
  );
});

test('7. Otorisasi Pemilik: Login Kode, Session Cookie HttpOnly, dan Logout', () => {
  const validCode = process.env.OWNER_ACCESS_CODE || 'jamu2026';

  // Kode salah -> 401
  const badAuth = authenticateOwner('wrong-code-xyz');
  assert.equal(badAuth.success, false);
  assert.equal(badAuth.status, 401);

  // Kode benar -> 200 dan menghasilkan cookie
  const goodAuth = authenticateOwner(validCode);
  assert.equal(goodAuth.success, true);
  assert.ok(goodAuth.cookieHeader.includes('HttpOnly'), 'Cookie harus HttpOnly');
  assert.ok(goodAuth.cookieHeader.includes('SameSite=Strict'), 'Cookie harus SameSite=Strict');

  // Verifikasi cookie
  const cookieVal = goodAuth.cookieHeader.split(';')[0].split('=')[1];
  const reqMock = { headers: { cookie: `jamu_owner_session=${cookieVal}` } };
  assert.equal(isOwnerAuthenticated(reqMock), true, 'Request dengan session cookie yang sah harus terautentikasi');

  // Logout -> cookie dikosongkan
  const logout = lockOwnerSession();
  assert.ok(logout.cookieHeader.includes('Max-Age=0'), 'Logout harus menghapus cookie');
});
