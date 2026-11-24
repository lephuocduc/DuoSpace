const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockElement, createSandbox, loadScripts } = require('./helpers/loadScript');

function setupInvestment(mockFetch) {
  const elements = {
    investmentForm: createMockElement('investmentForm', { classes: ['hidden'] }),
    investFormTitle: createMockElement('investFormTitle'),
    investName: createMockElement('investName', {
      value: 'Vàng DOJI / SJC (VND/chỉ)',
      options: [
        { value: 'BTC' },
        { value: 'BNB' },
        { value: 'Vàng DOJI / SJC (VND/chỉ)' },
        { value: 'Vàng thế giới (XAU/USD)' },
        { value: 'Bạc DOJI (VND/lượng)' },
        { value: 'Tiết kiệm USD' },
        { value: 'Tiết kiệm VNĐ' },
        { value: 'Khác' }
      ]
    }),
    investCustomNameRow: createMockElement('investCustomNameRow', { classes: ['hidden'] }),
    investCustomName: createMockElement('investCustomName'),
    investQtyUnitLabel: createMockElement('investQtyUnitLabel'),
    investBuyPriceUnitLabel: createMockElement('investBuyPriceUnitLabel'),
    investAutoPriceHint: createMockElement('investAutoPriceHint'),
    investQuantity: createMockElement('investQuantity'),
    investPurchaseDate: createMockElement('investPurchaseDate', { value: '2026-11-24' }),
    investBuyPrice: createMockElement('investBuyPrice'),
    investTarget: createMockElement('investTarget'),
    investIsUsd: createMockElement('investIsUsd', { checked: false }),
    investNotes: createMockElement('investNotes'),
    saveInvestBtn: createMockElement('saveInvestBtn'),
    investmentList: createMockElement('investmentList'),
    investTotalValue: createMockElement('investTotalValue'),
    investTotalCost: createMockElement('investTotalCost'),
    investTotalPnL: createMockElement('investTotalPnL'),
    investPriceBadges: createMockElement('investPriceBadges'),
    sellAssetModal: createMockElement('sellAssetModal', { classes: ['opacity-0', 'pointer-events-none'] }),
    sellAssetSelect: createMockElement('sellAssetSelect', { value: '0' }),
    sellCurrentQty: createMockElement('sellCurrentQty'),
    sellCurrentAvgBuy: createMockElement('sellCurrentAvgBuy'),
    sellCurrentPrice: createMockElement('sellCurrentPrice'),
    sellQuantity: createMockElement('sellQuantity'),
    sellPrice: createMockElement('sellPrice'),
    sellDate: createMockElement('sellDate', { value: '2026-11-24' }),
    sellNotes: createMockElement('sellNotes')
  };

  const ctx = createSandbox({ elements, fetch: mockFetch });
  loadScripts(ctx, ['js/config.js', 'js/utils.js', 'js/priceConfig.js', 'js/priceUpdater.js', 'js/modules/investment.js']);

  const app = {
    skipCharts: true,
    data: {
      usdRate: 25400,
      investments: [],
      netWorthHistory: [],
      expenses: []
    },
    save() { this.savedCount = (this.savedCount || 0) + 1; },
    log: { system() {} }
  };
  ctx.app = app;
  const inv = new ctx.InvestmentModule(app);
  app.investment = inv;
  return { ctx, app, inv, elements };
}

test('getAssetUnit returns chỉ for Vietnam gold and lượng for silver', () => {
  const { inv } = setupInvestment();
  assert.equal(inv.getAssetUnit('Vàng DOJI / SJC (VND/chỉ)'), 'chỉ');
  assert.equal(inv.getAssetUnit('Bạc DOJI (VND/lượng)'), 'lượng');
  assert.equal(inv.getAssetUnit('Vàng thế giới (XAU/USD)'), 'oz');
  assert.equal(inv.getAssetUnit('BTC'), 'BTC');
  assert.equal(inv.getAssetUnit('BNB'), 'BNB');
  assert.equal(inv.getAssetUnit('Vàng DOJI / SJC (VND/lượng)'), 'lượng');
  assert.equal(inv.getAssetUnit('Khác'), 'đơn vị');
});

test('onAssetNameChange updates form unit labels for gold (chỉ) and silver (lượng)', () => {
  const { inv, elements } = setupInvestment();
  elements.investName.value = 'Vàng DOJI / SJC (VND/chỉ)';
  inv.onAssetNameChange();
  assert.equal(elements.investQtyUnitLabel.textContent, '(chỉ)');
  assert.equal(elements.investBuyPriceUnitLabel.textContent, 'chỉ');
  assert.equal(elements.investIsUsd.checked, false);

  elements.investName.value = 'Bạc DOJI (VND/lượng)';
  inv.onAssetNameChange();
  assert.equal(elements.investQtyUnitLabel.textContent, '(lượng)');
  assert.equal(elements.investBuyPriceUnitLabel.textContent, 'lượng');
});

test('saveInvestment works without market price input, groups purchases, and auto-updates market price', async () => {
  const { ctx, app, inv, elements } = setupInvestment(async (url) => {
    if (url.includes('vang.today')) {
      return { ok: true, async json() { return { success: true, buy: 135000000 }; } };
    }
    return { ok: false, status: 404 };
  });

  // Note: no #investCurrentPrice element exists in DOM
  elements.investName.value = 'Vàng DOJI / SJC (VND/chỉ)';
  elements.investQuantity.value = '2';
  elements.investBuyPrice.value = '12.500.000';
  elements.investIsUsd.checked = false;

  inv.saveInvestment();
  assert.equal(ctx._alerts.length, 0);
  assert.equal(app.data.investments.length, 1);
  assert.equal(app.data.investments[0].unit, 'chỉ');
  assert.equal(app.data.investments[0].quantity, 2);
  assert.equal(app.data.investments[0].buyPrice, 12500000);

  // Wait for background refreshSingle to complete
  await new Promise(r => setTimeout(r, 20));
  assert.equal(app.data.investments[0].currentPrice, 13500000); // 135,000,000 / 10
  assert.equal(ctx._alerts.length, 0);

  // Add second purchase of same gold asset -> should group & compute weighted avg buyPrice, preserving live currentPrice
  elements.investQuantity.value = '3';
  elements.investBuyPrice.value = '13.000.000';
  inv.saveInvestment();

  assert.equal(app.data.investments.length, 1);
  assert.equal(app.data.investments[0].quantity, 5);
  assert.equal(app.data.investments[0].buyPrice, (2 * 12500000 + 3 * 13000000) / 5);
  assert.equal(app.data.investments[0].currentPrice, 13500000);
});

test('fetchPriceForCurrentForm never shows success alert', async () => {
  const { ctx, inv, elements } = setupInvestment(async (url) => {
    if (url.includes('/api/prices/silver')) {
      return { ok: true, async json() { return { success: true, buy: 1341000, sell: 1382000 }; } };
    }
    return { ok: false, status: 404 };
  });

  elements.investName.value = 'Bạc DOJI (VND/lượng)';
  const price = await inv.fetchPriceForCurrentForm();
  assert.equal(price, 1341000);
  assert.equal(ctx._alerts.length, 0);
});

test('confirmSellAsset reduces quantity and records negative purchase', () => {
  const { app, inv, elements } = setupInvestment();
  app.data.investments.push({
    name: 'Bạc DOJI (VND/lượng)',
    type: '🥈 Bạc',
    unit: 'lượng',
    quantity: 10,
    buyPrice: 1200000,
    currentPrice: 1350000,
    isUsd: false,
    purchases: [{ date: '2026-11-01', quantity: 10, buyPrice: 1200000, notes: '' }]
  });

  elements.sellAssetSelect.value = '0';
  elements.sellQuantity.value = '4';
  elements.sellPrice.value = '1.350.000';
  elements.sellNotes.value = 'Chốt lời';

  inv.confirmSellAsset();
  assert.equal(app.data.investments[0].quantity, 6);
  assert.equal(app.data.investments[0].buyPrice, 1200000);
  assert.equal(app.data.investments[0].purchases.length, 2);
  assert.equal(app.data.investments[0].purchases[1].quantity, -4);
});

test('recordDailyNetWorth sums VND and USD assets accurately', () => {
  const { app, inv } = setupInvestment();
  app.data.usdRate = 25000;
  app.data.investments = [
    { name: 'Vàng DOJI / SJC (VND/chỉ)', quantity: 2, buyPrice: 12000000, currentPrice: 13000000, isUsd: false },
    { name: 'Bạc DOJI (VND/lượng)', quantity: 5, buyPrice: 1200000, currentPrice: 1340000, isUsd: false },
    { name: 'BTC', quantity: 0.1, buyPrice: 80000, currentPrice: 90000, isUsd: true }
  ];

  inv.recordDailyNetWorth();
  assert.equal(app.data.netWorthHistory.length, 1);
  // 2*13,000,000 + 5*1,340,000 + 0.1*90,000*25,000 = 26,000,000 + 6,700,000 + 225,000,000 = 257,700,000
  assert.equal(app.data.netWorthHistory[0].value, 257700000);
});

test('recordDailyNetWorth backfills past purchase dates chronologically', () => {
  const { app, inv } = setupInvestment();
  app.data.usdRate = 25000;
  app.data.investments = [
    {
      name: 'BTC',
      quantity: 0.0007,
      buyPrice: 63157.14,
      currentPrice: 60000,
      isUsd: true,
      purchases: [
        { date: '2026-11-14', quantity: 0.00027, buyPrice: 65000 },
        { date: '2026-11-20', quantity: 0.00043, buyPrice: 62000 }
      ]
    },
    {
      name: 'Vàng DOJI / SJC (VND/chỉ)',
      quantity: 0.5,
      buyPrice: 13750000,
      currentPrice: 13000000,
      isUsd: false,
      purchases: [
        { date: '2026-11-15', quantity: 0.5, buyPrice: 13750000 }
      ]
    }
  ];

  inv.recordDailyNetWorth();
  const dates = app.data.netWorthHistory.map(h => h.date);
  assert.equal(dates[0], '2026-11-14');
  assert.equal(dates[1], '2026-11-15');
  assert.equal(dates[2], '2026-11-20');
  assert.equal(dates.length, 4); // 3 past dates + today
  assert.equal(app.data.netWorthHistory[0].value, Math.round(0.00027 * 65000 * 25000));
  assert.equal(app.data.netWorthHistory[1].value, Math.round(0.00027 * 65000 * 25000 + 0.5 * 13750000));
});
