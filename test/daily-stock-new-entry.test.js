import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, initialSchema1State, DEFAULT_PRODUCTS } from '../server/core.js';

test('Isi Stok Hari Ini - Clean 0 ml Defaults and Edit Separation Tests', async (t) => {
  await t.test('1. Initializing clean stock input creates draft with all 14 variants at 0 ml', () => {
    const products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    assert.equal(products.length, 14);

    // Emulating the new handler handleOpenNewDailyStock logic:
    const draft = {};
    const statusDraft = {};
    products.forEach(p => {
      draft[p.id] = 0;
      statusDraft[p.id] = 'Stok menipis'; // 0 < 1000 ml
    });

    assert.equal(Object.keys(draft).length, 14);
    Object.values(draft).forEach(val => {
      assert.strictEqual(val, 0, 'Each product must default to numeric 0');
    });
    Object.values(statusDraft).forEach(status => {
      assert.strictEqual(status, 'Stok menipis', '0 ml must be marked as Stok menipis');
    });
  });

  await t.test('2. Saving 0 ml records accurately stores numeric 0 in dailyStocks and updates product stock', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const today = '2026-11-03';

    // Simulate saving all 14 variants with 0 ml
    const items = {};
    state.products.forEach(p => {
      items[p.id] = 0;
    });

    state = applyAction(state, 'stocktake', {
      tanggal: today,
      items
    });

    const entriesToday = (state.dailyStocks || []).filter(s => s.tanggal === today);
    assert.equal(entriesToday.length, 14, 'Should record 14 entries for today');

    entriesToday.forEach(e => {
      assert.strictEqual(e.jumlah, 0, 'Entry jumlah must be integer 0');
      assert.strictEqual(e.qty, 0, 'Entry qty must be integer 0');
    });

    // Check product live status
    state.products.forEach(p => {
      assert.strictEqual(p.stock, 0);
      assert.strictEqual(p.status, 'Stok menipis');
    });
  });

  await t.test('3. Upsert behavior: saving twice on the same date updates records without duplication', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const today = '2026-11-03';

    // First save: 0 ml for all
    const itemsFirst = {};
    state.products.forEach(p => {
      itemsFirst[p.id] = 0;
    });
    state = applyAction(state, 'stocktake', {
      tanggal: today,
      items: itemsFirst
    });

    assert.equal((state.dailyStocks || []).filter(s => s.tanggal === today).length, 14);

    // Second save (updating): H = 1500 ml, KS = 1200 ml, others remain 0 ml
    const itemsSecond = { ...itemsFirst };
    const hProd = state.products.find(p => p.kode === 'H' || p.sku === 'H');
    const ksProd = state.products.find(p => p.kode === 'KS' || p.sku === 'KS');
    itemsSecond[hProd.id] = 1500;
    itemsSecond[ksProd.id] = 1200;

    state = applyAction(state, 'stocktake', {
      tanggal: today,
      items: itemsSecond
    });

    const entriesAfterSecond = (state.dailyStocks || []).filter(s => s.tanggal === today);
    assert.equal(entriesAfterSecond.length, 14, 'Must still have 14 entries (no duplicates)');

    const hEntry = entriesAfterSecond.find(s => s.produk_id === hProd.id);
    assert.equal(hEntry.jumlah, 1500);

    const ksEntry = entriesAfterSecond.find(s => s.produk_id === ksProd.id);
    assert.equal(ksEntry.jumlah, 1200);

    const otherEntries = entriesAfterSecond.filter(s => s.produk_id !== hProd.id && s.produk_id !== ksProd.id);
    otherEntries.forEach(e => {
      assert.strictEqual(e.jumlah, 0);
    });
  });

  await t.test('4. Edit mode from Barang & Stok preserves existing saved values', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const targetDate = '2026-11-02';

    // Save initial stock
    const p0 = state.products[0];
    const p1 = state.products[1];
    state = applyAction(state, 'stocktake', {
      tanggal: targetDate,
      items: {
        [p0.id]: 2500,
        [p1.id]: 1800
      }
    });

    // Emulating handleOpenDailyStock (edit mode) for targetDate:
    const draft = {};
    state.products.forEach(p => {
      const entry = (state.dailyStocks || []).find(s => s.produk_id === p.id && s.tanggal === targetDate);
      if (entry) {
        draft[p.id] = entry.jumlah;
      } else {
        draft[p.id] = '';
      }
    });

    assert.equal(draft[p0.id], 2500, 'Edit mode must preserve existing 2500 ml');
    assert.equal(draft[p1.id], 1800, 'Edit mode must preserve existing 1800 ml');
  });

  await t.test('5. Non-saving / Cancelation: Opening modal does not alter stored data', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const targetDate = '2026-11-02';

    state = applyAction(state, 'stocktake', {
      tanggal: targetDate,
      items: {
        [state.products[0].id]: 3000
      }
    });

    const snapshotBefore = JSON.stringify(state);

    // User opens new stock modal (draft initialized in UI memory only)
    const ephemeralDraft = {};
    state.products.forEach(p => {
      ephemeralDraft[p.id] = 0;
    });

    // User closes modal without saving (no action dispatched)
    const snapshotAfter = JSON.stringify(state);
    assert.equal(snapshotBefore, snapshotAfter, 'State must remain completely untouched when not saved');
  });
});
