const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadScripts } = require('./helpers/loadScript');

function setupPriceUpdater(mockFetch) {
  const ctx = createSandbox({ fetch: mockFetch });
  loadScripts(ctx, ['js/config.js', 'js/priceConfig.js', 'js/priceUpdater.js']);
  return ctx;
}

test('fetchVnGoldPrice converts VND/lượng to VND/chỉ by default and supports tael unit', async () => {
  const calls = [];
  const ctx = setupPriceUpdater(async (url) => {
    calls.push(url);
    return {
      ok: true,
      async json() {
        return { success: true, type: 'DOJINHTV', buy: 130000000, sell: 135000000 };
      }
    };
  });

  const pricePerChi = await ctx.priceUpdater.fetchVnGoldPrice();
  assert.equal(pricePerChi, 13000000);

  // Uses cache for tael conversion without extra fetch
  const pricePerTael = await ctx.priceUpdater.fetchVnGoldPrice('tael');
  assert.equal(pricePerTael, 130000000);
  assert.equal(calls.length, 1);
});

test('fetchVnSilverPrice prefers Worker live domestic silver price (VND/lượng)', async () => {
  const calls = [];
  const ctx = setupPriceUpdater(async (url) => {
    calls.push(url);
    if (url.includes('/api/prices/silver')) {
      return {
        ok: true,
        async json() {
          return { success: true, source: 'giabac.phuquygroup.vn', unit: 'lượng', buy: 1339000, sell: 1380000 };
        }
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const price = await ctx.priceUpdater.fetchVnSilverPrice();
  assert.equal(price, 1339000);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/api\/prices\/silver$/);
});

test('fetchVnSilverPrice falls back to CoinGecko KAG then currency-api when Worker fails', async () => {
  const ctx1 = setupPriceUpdater(async (url) => {
    if (url.includes('/api/prices/silver')) return { ok: false, status: 502 };
    if (url.includes('coingecko.com')) {
      return {
        ok: true,
        async json() { return { 'kinesis-silver': { vnd: 1138052 } }; }
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const priceFromKag = await ctx1.priceUpdater.fetchVnSilverPrice();
  assert.equal(priceFromKag, Math.round((1138052 * 1.2057) / 1000) * 1000);

  const ctx2 = setupPriceUpdater(async (url) => {
    if (url.includes('/api/prices/silver')) return { ok: false, status: 502 };
    if (url.includes('coingecko.com')) return { ok: false, status: 429 };
    if (url.includes('currencies/xag.json')) {
      return {
        ok: true,
        async json() { return { xag: { vnd: 1101650 } }; }
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const priceFromCurrencyApi = await ctx2.priceUpdater.fetchVnSilverPrice();
  assert.equal(priceFromCurrencyApi, Math.round((1101650 * 1.2057) / 1000) * 1000);
});

test('updateSingleItem updates gold in chỉ, legacy gold in lượng, and silver in lượng', async () => {
  const ctx = setupPriceUpdater(async (url) => {
    if (url.includes('vang.today')) {
      return { ok: true, async json() { return { success: true, buy: 132000000 }; } };
    }
    if (url.includes('/api/prices/silver')) {
      return { ok: true, async json() { return { success: true, buy: 1341000, sell: 1382000 }; } };
    }
    return { ok: false, status: 404 };
  });

  const goldChiItem = {
    name: 'Vàng DOJI / SJC (VND/chỉ)',
    unit: 'chỉ',
    isUsd: false,
    currentPrice: 12000000,
    priceSource: { type: 'gold_vn', symbol: 'XAU', refreshInterval: 86400, lastUpdated: new Date(0).toISOString(), fetchStatus: 'pending' }
  };
  await ctx.priceUpdater.updateSingleItem(goldChiItem, 25400);
  assert.equal(goldChiItem.currentPrice, 13200000);
  assert.equal(goldChiItem.priceSource.fetchStatus, 'success');

  const legacyGoldTaelItem = {
    name: 'Vàng DOJI / SJC (VND/lượng)',
    isUsd: false,
    currentPrice: 120000000,
    priceSource: { type: 'gold_vn', symbol: 'XAU', refreshInterval: 86400, lastUpdated: new Date(0).toISOString(), fetchStatus: 'pending' }
  };
  await ctx.priceUpdater.updateSingleItem(legacyGoldTaelItem, 25400);
  assert.equal(legacyGoldTaelItem.currentPrice, 132000000);

  const silverItem = {
    name: 'Bạc DOJI (VND/lượng)',
    unit: 'lượng',
    isUsd: false,
    currentPrice: 1300000,
    priceSource: { type: 'silver_vn', symbol: 'XAG', refreshInterval: 86400, lastUpdated: new Date(0).toISOString(), fetchStatus: 'pending' }
  };
  await ctx.priceUpdater.updateSingleItem(silverItem, 25400);
  assert.equal(silverItem.currentPrice, 1341000);
  assert.equal(silverItem.priceSource.fetchStatus, 'success');
});

test('updateSingleItem skips manual items and respects refreshInterval', async () => {
  let fetchCount = 0;
  const ctx = setupPriceUpdater(async () => {
    fetchCount++;
    return { ok: true, async json() { return { bitcoin: { usd: 95000 } }; } };
  });

  const manualItem = {
    name: 'Tiết kiệm VNĐ',
    currentPrice: 10000000,
    priceSource: { type: 'manual', refreshInterval: 86400, lastUpdated: new Date(0).toISOString() }
  };
  await ctx.priceUpdater.updateSingleItem(manualItem, 25400);
  assert.equal(fetchCount, 0);

  const freshBtc = {
    name: 'BTC',
    currentPrice: 90000,
    priceSource: { type: 'crypto', symbol: 'BTC', refreshInterval: 3600, lastUpdated: new Date().toISOString() }
  };
  await ctx.priceUpdater.updateSingleItem(freshBtc, 25400);
  assert.equal(fetchCount, 0);
  assert.equal(freshBtc.currentPrice, 90000);
});

test('migrateOldInvestments divides mistakenly saved tael gold price by 10 for chỉ asset', () => {
  const ctx = setupPriceUpdater();
  const migrated = ctx.PriceUpdater.migrateOldInvestments([
    {
      name: 'Vàng DOJI / SJC (VND/chỉ)',
      quantity: 0.5,
      buyPrice: 13750000,
      currentPrice: 130000000,
      isUsd: false,
      priceSource: { type: 'gold_vn', symbol: 'XAU', refreshInterval: 86400, lastUpdated: new Date().toISOString(), fetchStatus: 'success' }
    }
  ]);

  assert.equal(migrated[0].currentPrice, 13000000);
  assert.equal(migrated[0].unit, 'chỉ');
});
