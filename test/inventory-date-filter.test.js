import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, initialSchema1State, DEFAULT_PRODUCTS } from '../server/core.js';

test('Inventory Date Filter & Date-Specific Stocktake Tests', async (t) => {
  await t.test('1. Default clean state has 14 products and 0 stock entries', () => {
    const state = JSON.parse(JSON.stringify(initialSchema1State));
    assert.equal(state.products.length, 14);
    assert.equal((state.dailyStocks || []).length, 0);
  });

  await t.test('2. Input stock for yesterday (2026-11-02) records entries strictly for that date', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const yesterday = '2026-11-02';
    
    // Record stock for 14 products on yesterday
    const items = {};
    state.products.forEach((p, idx) => {
      items[p.id] = 1000 + (idx * 50); // 1000, 1050, 1100, ...
    });

    state = applyAction(state, 'stocktake', {
      tanggal: yesterday,
      items
    });

    const entriesYesterday = (state.dailyStocks || []).filter(s => s.tanggal === yesterday);
    assert.equal(entriesYesterday.length, 14);

    const totalYesterday = entriesYesterday.reduce((sum, e) => sum + e.jumlah, 0);
    // 14 * 1000 + 50 * (13 * 14 / 2) = 14000 + 4550 = 18550
    assert.equal(totalYesterday, 18550);
  });

  await t.test('3. Querying today (2026-11-03) before today is recorded returns 0 entries without fallback or silent zero', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const yesterday = '2026-11-02';
    const today = '2026-11-03';

    // Record only for yesterday
    state = applyAction(state, 'stocktake', {
      tanggal: yesterday,
      items: { [state.products[0].id]: 1500 }
    });

    const entriesToday = (state.dailyStocks || []).filter(s => s.tanggal === today);
    assert.equal(entriesToday.length, 0, 'Today must not have entries before being input');
    
    const entriesYesterday = (state.dailyStocks || []).filter(s => s.tanggal === yesterday);
    assert.equal(entriesYesterday.length, 1);
    assert.equal(entriesYesterday[0].jumlah, 1500);
  });

  await t.test('4. Partial input detection: identifies incomplete stock entries for a date', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const targetDate = '2026-11-02';

    // Record only 3 out of 14 products
    state = applyAction(state, 'stocktake', {
      tanggal: targetDate,
      items: {
        [state.products[0].id]: 1200,
        [state.products[1].id]: 800,
        [state.products[2].id]: 1500
      }
    });

    const entries = (state.dailyStocks || []).filter(s => s.tanggal === targetDate);
    assert.equal(entries.length, 3);
    const isComplete = entries.length >= 14;
    assert.equal(isComplete, false, '3 of 14 items should be marked incomplete');
  });

  await t.test('5. Editing single product for past date updates that date and preserves newer dates', () => {
    let state = JSON.parse(JSON.stringify(initialSchema1State));
    const pastDate = '2026-11-01';
    const newerDate = '2026-11-02';
    const prodId = state.products[0].id;

    // First, input stock for pastDate
    state = applyAction(state, 'stocktake', {
      tanggal: pastDate,
      items: { [prodId]: 1000 }
    });

    // Next, input stock for newerDate
    state = applyAction(state, 'stocktake', {
      tanggal: newerDate,
      items: { [prodId]: 1400 }
    });

    // Check product live stock is newerDate
    const prodAfterNewer = state.products.find(p => p.id === prodId);
    assert.equal(prodAfterNewer.stock, 1400);

    // Now, edit pastDate stock
    state = applyAction(state, 'stocktake', {
      tanggal: pastDate,
      items: { [prodId]: 1200 }
    });

    // pastDate entry should be updated
    const pastEntry = (state.dailyStocks || []).find(s => s.tanggal === pastDate && s.produk_id === prodId);
    assert.equal(pastEntry.jumlah, 1200);

    // newerDate entry must remain intact
    const newerEntry = (state.dailyStocks || []).find(s => s.tanggal === newerDate && s.produk_id === prodId);
    assert.equal(newerEntry.jumlah, 1400);

    // product live stock should still be 1400 because newerDate >= pastDate
    const prodAfterPastEdit = state.products.find(p => p.id === prodId);
    assert.equal(prodAfterPastEdit.stock, 1400, 'Live stock should remain from the newer snapshot');
  });
});
