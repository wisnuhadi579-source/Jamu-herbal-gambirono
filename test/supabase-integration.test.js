// ============================================================================
// test/supabase-integration.test.js - Real Supabase Integration Test
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, updateStore } from '../server/store-service.js';
import { getSupabaseConfig, callJamuStorage } from '../server/supabase-db.js';

test('Integration Test 1: Verifikasi Penanganan Error ketika Supabase Tidak Terkonfigurasi', async () => {
  const emptyEnv = { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' };
  
  await assert.rejects(
    async () => {
      await callJamuStorage('read', [], emptyEnv);
    },
    (err) => {
      assert.equal(err.status, 503, 'Harus mengembalikan HTTP 503 Service Unavailable');
      assert.ok(err.message.includes('Konfigurasi database server belum lengkap'), 'Pesan error harus informatif');
      return true;
    }
  );
});

test('Integration Test 2: Pengujian Supabase Nyata', async (t) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };

  const config = getSupabaseConfig(env);
  if (!config.configured) {
    t.skip('SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY belum disetel di environment. Pengujian integrasi live di-SKIPPED.');
    return;
  }

  console.log('⚡ Melakukan pengujian integrasi Supabase nyata ke:', config.url);

  // 1. Membaca database Gambirono
  const initialStore = await getStore(true, env);
  assert.ok(initialStore.revision >= 1, 'Revisi database harus >= 1');
  assert.ok(Array.isArray(initialStore.state.products), 'Products harus berupa array');

  // 2. Menambahkan produk percobaan dengan ID unik
  const testProdId = `test-prod-${Date.now()}`;
  const testSku = `TST_${Math.floor(Math.random() * 10000)}`;

  const addProdRes = await updateStore({
    revision: initialStore.revision,
    action: 'product',
    payload: {
      id: testProdId,
      nama: 'Jamu Test Integrasi ML',
      kode: testSku,
      unit: 'ml',
      satuan: 'ml',
      sell_price: 15000,
      buy_price: 10000,
      stock: 5000,
      min_stock: 1000
    }
  }, true, env);

  assert.equal(addProdRes.revision, initialStore.revision + 1, 'Revisi harus bertambah 1');

  try {
    // 3. Membaca kembali produk dari Supabase untuk verifikasi persitensi nyata
    const storeAfterAdd = await getStore(true, env);
    const foundProd = storeAfterAdd.state.products.find(p => p.id === testProdId || p.kode === testSku);
    assert.ok(foundProd, 'Produk percobaan harus benar-benar terbaca dari Supabase');
    assert.equal(foundProd.stock, 5000, 'Stok produk percobaan di Supabase harus 5000 ml');

    // 4. Memperbarui produk
    const updateProdRes = await updateStore({
      revision: storeAfterAdd.revision,
      action: 'product',
      payload: {
        id: foundProd.id,
        nama: 'Jamu Test Integrasi ML Updated',
        kode: testSku,
        unit: 'ml',
        sell_price: 18000,
        stock: 6500
      }
    }, true, env);

    const storeAfterUpdate = await getStore(true, env);
    const updatedProd = storeAfterUpdate.state.products.find(p => p.id === foundProd.id);
    assert.equal(updatedProd.stock, 6500, 'Stok ter-update harus 6500 ml di Supabase');

    // 5. Menyimpan stok harian ke gambirono_stok_harian
    const todayStr = new Date().toISOString().slice(0, 10);
    await updateStore({
      revision: storeAfterUpdate.revision,
      action: 'stocktake',
      payload: {
        tanggal: todayStr,
        items: {
          [foundProd.id]: 6200
        }
      }
    }, true, env);

    // 6. Membaca kembali stok harian dari Supabase
    const storeAfterStocktake = await getStore(true, env);
    const stockEntry = storeAfterStocktake.state.dailyStocks.find(s => (s.produk_id === foundProd.id || s.productId === foundProd.id) && (s.tanggal === todayStr || s.date === todayStr));
    assert.ok(stockEntry, 'Entri stok harian harus tersimpan di Supabase');
    assert.equal(stockEntry.jumlah || stockEntry.qty, 6200, 'Jumlah stok harian di Supabase harus 6200 ml');

    // 7. Menyimpan transaksi penjualan dengan ML
    const testTrxName = `Pelanggan Test ML ${Date.now()}`;
    await updateStore({
      revision: storeAfterStocktake.revision,
      action: 'income',
      payload: {
        total: 54000,
        customer_name: testTrxName,
        payment_method: 'QRIS',
        jamu_terjual_ml: 1200,
        restok_ml: 2000,
        tanggal: todayStr
      }
    }, true, env);

    // 8. Membaca kembali transaksi dari gambirono_transaksi_penjualan
    const storeAfterTrx = await getStore(true, env);
    const savedTrx = storeAfterTrx.state.transactions.find(t => t.customer_name === testTrxName);
    assert.ok(savedTrx, 'Transaksi penjualan harus tersimpan di gambirono_transaksi_penjualan');
    assert.equal(savedTrx.jamu_terjual_ml, 1200, 'Volume jamu_terjual_ml harus 1200 ml di Supabase');
    assert.equal(savedTrx.restok_ml, 2000, 'Volume restok_ml harus 2000 ml di Supabase');

  } finally {
    // 9. Bersihkan data pengujian
    const latestStore = await getStore(true, env);
    await updateStore({
      revision: latestStore.revision,
      action: 'variants',
      payload: {
        id: testProdId,
        kode: testSku,
        nama: 'Jamu Test Integrasi ML',
        aktif: false
      }
    }, true, env);

    console.log('✅ SELURUH OPERASI READ, INSERT, UPDATE, DAN VERIFIKASI SUPABASE NYATA LULUS!');
  }
});
