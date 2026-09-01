/**
 * DuoSpace - Price Updater Module
 * Tự động fetch & cập nhật giá tài sản từ nhiều nguồn API khác nhau.
 * Có in-memory cache để tránh gọi API quá nhiều.
 */
class PriceUpdater {
  constructor() {
    // In-memory cache: { symbol: { price, timestamp } }
    this._cache = {};
    this._autoTimer = null;
  }

  // ─────────────────────────────────────────────
  // CACHE HELPERS
  // ─────────────────────────────────────────────

  _getCached(key) {
    const entry = this._cache[key];
    if (!entry) return null;
    const ageSeconds = (Date.now() - entry.ts) / 1000;
    // Cache tồn tại 10 phút (600s)
    if (ageSeconds < 600) return entry.price;
    delete this._cache[key];
    return null;
  }

  _setCache(key, price) {
    this._cache[key] = { price, ts: Date.now() };
  }

  // ─────────────────────────────────────────────
  // FETCH FUNCTIONS (per source type)
  // ─────────────────────────────────────────────

  /**
   * Fetch giá crypto từ CoinGecko (USD/unit)
   * @param {string} symbol - e.g. 'BTC', 'ETH'
   * @returns {number|null}
   */
  async fetchCryptoPrice(symbol) {
    const cacheKey = `crypto:${symbol.toUpperCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    const id = PRICE_CONFIG.CRYPTO.mapping[symbol.toUpperCase()];
    if (!id) {
      console.warn(`[PriceUpdater] Crypto symbol "${symbol}" not found in mapping`);
      return null;
    }

    try {
      const url = `${PRICE_CONFIG.CRYPTO.api}${PRICE_CONFIG.CRYPTO.endpoint}?ids=${id}&vs_currencies=usd`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const price = data[id]?.usd ?? null;
      if (price !== null) this._setCache(cacheKey, price);
      return price;
    } catch (err) {
      console.error(`[PriceUpdater] Crypto "${symbol}" fetch error:`, err);
      return null;
    }
  }

  /**
   * Fetch giá vàng thế giới (USD/troy oz)
   * @returns {number|null} - USD/troy oz
   */
  async fetchGoldPriceUsd() {
    const cacheKey = 'gold:XAU_USD';
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const url = `${PRICE_CONFIG.GOLD.api}${PRICE_CONFIG.GOLD.endpoint}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // metals.live trả về: { gold: <price/oz>, ... }
      const price = typeof data.gold === 'number' ? data.gold : null;
      if (price !== null) this._setCache(cacheKey, price);
      return price;
    } catch (err) {
      console.error(`[PriceUpdater] Gold fetch error:`, err);
      return null;
    }
  }

  /**
   * Fetch tỷ giá USD/VND
   * @returns {number|null}
   */
  async fetchUsdRate() {
    const cacheKey = 'usd:VND';
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const res = await fetch(CONFIG.USD_RATE_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rate = data?.rates?.VND ? Math.round(data.rates.VND) : null;
      if (rate !== null) this._setCache(cacheKey, rate);
      return rate;
    } catch (err) {
      console.error(`[PriceUpdater] USD rate fetch error:`, err);
      return null;
    }
  }

  /**
   * Fetch giá cổ phiếu từ Alpha Vantage
   * @param {string} symbol - e.g. 'AAPL', 'VNM'
   * @param {string} apiKey - Alpha Vantage key
   * @returns {number|null}
   */
  async fetchStockPrice(symbol, apiKey) {
    if (!apiKey) return null;
    const cacheKey = `stock:${symbol.toUpperCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const url = `${PRICE_CONFIG.STOCK.api}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data?.['Global Quote']?.['05. price'];
      const price = raw ? parseFloat(raw) : null;
      if (price !== null) this._setCache(cacheKey, price);
      return price;
    } catch (err) {
      console.error(`[PriceUpdater] Stock "${symbol}" fetch error:`, err);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // PUBLIC: Test fetch (dùng từ form "Test Giá Ngay")
  // ─────────────────────────────────────────────

  /**
   * Test fetch giá cho 1 asset và điền vào form
   * @returns {number|null} price (đơn vị gốc của source)
   */
  async testFetch(sourceType, symbol, usdRate) {
    let price = null;
    switch (sourceType) {
      case 'crypto':
        price = await this.fetchCryptoPrice(symbol);
        break;
      case 'gold':
        // Trả về USD/troy oz để user thấy. Investment module sẽ convert sau.
        price = await this.fetchGoldPriceUsd();
        break;
      case 'usd':
        price = await this.fetchUsdRate();
        break;
      case 'stock': {
        const key = localStorage.getItem('avApiKey') || '';
        price = await this.fetchStockPrice(symbol, key);
        break;
      }
      default:
        break;
    }
    return price;
  }

  // ─────────────────────────────────────────────
  // CORE: Update single investment item
  // ─────────────────────────────────────────────

  /**
   * Cập nhật currentPrice cho 1 investment item nếu đã đến thời điểm refresh.
   * Trả về item (có thể đã cập nhật).
   */
  async updateSingleItem(item, usdRate) {
    const ps = item.priceSource;
    if (!ps || ps.type === 'manual') return item;

    const nowSec = Date.now() / 1000;
    const lastSec = ps.lastUpdated ? new Date(ps.lastUpdated).getTime() / 1000 : 0;
    const interval = ps.refreshInterval || 3600;

    if (nowSec - lastSec < interval) return item; // Chưa đến lúc refresh

    let newPrice = null;
    try {
      switch (ps.type) {
        case 'crypto':
          newPrice = await this.fetchCryptoPrice(ps.symbol);
          break;

        case 'gold': {
          const priceUsdPerOz = await this.fetchGoldPriceUsd();
          if (priceUsdPerOz !== null) {
            if (ps.goldUnit === 'tael') {
              // 1 lượng vàng = 37.5g = 1.2057 troy oz
              newPrice = priceUsdPerOz * PRICE_CONFIG.GOLD.taelToOz;
            } else {
              newPrice = priceUsdPerOz; // USD/troy oz
            }
            // Nếu asset lưu giá VND (không phải USD), convert luôn
            if (!item.isUsd && newPrice !== null) {
              newPrice = newPrice * usdRate;
            }
          }
          break;
        }

        case 'usd': {
          const rate = await this.fetchUsdRate();
          // USD asset: currentPrice là tỷ giá (1 USD = X VND)
          // Đây là trường hợp đặc biệt để lưu cash USD
          newPrice = rate;
          break;
        }

        case 'stock': {
          const apiKey = localStorage.getItem('avApiKey') || '';
          newPrice = await this.fetchStockPrice(ps.symbol, apiKey);
          break;
        }
      }

      if (newPrice !== null && !isNaN(newPrice)) {
        item.currentPrice = newPrice;
        item.priceSource.lastUpdated = new Date().toISOString();
        item.priceSource.fetchStatus = 'success';
      } else {
        item.priceSource.fetchStatus = 'error';
      }
    } catch (err) {
      item.priceSource.fetchStatus = 'error';
    }

    return item;
  }

  // ─────────────────────────────────────────────
  // CORE: Update all investments
  // ─────────────────────────────────────────────

  async updateAllPrices() {
    if (!window.app) return;
    const data = window.app.data;
    if (!data.investments || data.investments.length === 0) return;

    const usdRate = data.usdRate || 25400;
    let changed = false;

    for (let i = 0; i < data.investments.length; i++) {
      const before = data.investments[i].currentPrice;
      data.investments[i] = await this.updateSingleItem(data.investments[i], usdRate);
      if (data.investments[i].currentPrice !== before) changed = true;
    }

    if (changed) {
      window.app.save();
      window.app.investment.renderInvestmentList();
      console.log('[PriceUpdater] Prices updated and UI refreshed');
    }
  }

  // ─────────────────────────────────────────────
  // AUTO-REFRESH TIMER
  // ─────────────────────────────────────────────

  startAutoUpdate() {
    if (this._autoTimer) return; // Đã chạy rồi
    this._autoTimer = setInterval(() => {
      this.updateAllPrices();
    }, PRICE_CONFIG.AUTO_CHECK_INTERVAL);
    console.log(`[PriceUpdater] Auto-update started (check every ${PRICE_CONFIG.AUTO_CHECK_INTERVAL / 60000} min)`);
  }

  stopAutoUpdate() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
  }

  // ─────────────────────────────────────────────
  // MIGRATION: Convert old data format → new
  // ─────────────────────────────────────────────

  static migrateOldInvestments(investments) {
    return investments.map(inv => {
      if (inv.priceSource) return inv; // Đã có priceSource, bỏ qua
      return {
        ...inv,
        priceSource: {
          type: 'manual',
          symbol: null,
          refreshInterval: 86400,
          goldUnit: 'oz',
          lastUpdated: new Date(0).toISOString(), // Epoch → sẽ refresh ngay nếu đổi type
          fetchStatus: 'pending'
        }
      };
    });
  }
}

// ─────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────
const priceUpdater = new PriceUpdater();

// ─────────────────────────────────────────────
// GLOBAL ALIAS: dùng từ form button onclick
// ─────────────────────────────────────────────
async function testPriceFetch() {
  const sourceType = (document.getElementById('investPriceSourceType') || {}).value;
  const symbolRaw = (document.getElementById('investPriceSourceSymbol') || {}).value || '';
  const symbol = symbolRaw.trim().toUpperCase();
  const usdRate = parseFloat((document.getElementById('usdRateInput') || {}).value) || 25400;
  const btn = document.getElementById('testPriceBtn');

  if (sourceType === 'manual') {
    alert('Loại "Thủ công" không cần fetch giá tự động.');
    return;
  }
  if ((sourceType === 'crypto' || sourceType === 'stock') && !symbol) {
    alert('Vui lòng nhập Mã tài sản (BTC, ETH, AAPL...).');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Đang fetch...';
  }

  const price = await priceUpdater.testFetch(sourceType, symbol, usdRate);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-flask mr-1"></i>Test Fetch Giá Ngay';
  }

  if (price !== null && !isNaN(price)) {
    const formatted = price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    const unit = sourceType === 'usd' ? 'VND/USD' : (sourceType === 'gold' ? 'USD/oz' : (sourceType === 'stock' ? 'USD' : 'USD'));
    alert(`✅ Fetch thành công!\n${symbol || sourceType.toUpperCase()}: ${formatted} ${unit}\n\nGiá đã được điền vào ô "Giá hiện tại".`);
    const priceInput = document.getElementById('investCurrentPrice');
    if (priceInput) priceInput.value = parseFloat(price.toFixed(8));
  } else {
    alert(`❌ Fetch thất bại!\n\nCó thể do:\n• Mã tài sản không đúng\n• API rate limit (thử lại sau)\n• Mất kết nối internet`);
  }
}
