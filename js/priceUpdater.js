/**
 * DuoSpace - Price Updater Module
 * Tự động fetch & cập nhật giá tài sản từ nhiều nguồn API khác nhau.
 * Có in-memory cache để tránh gọi API quá nhiều.
 *
 * v4.0: Bỏ cấu hình thủ công nguồn giá & mã tài sản.
 *       Hệ thống tự động suy luận nguồn giá dựa trên tên tài sản từ catalog.
 *       Gold API: vang.today (CORS OK, free, cập nhật 5 phút/lần)
 */
class PriceUpdater {
  constructor() {
    // In-memory cache: { cacheKey: { price, ts } }
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
  // FETCH FUNCTIONS
  // ─────────────────────────────────────────────

  /**
   * Fetch giá crypto từ CoinGecko (USD/unit)
   * @param {string} symbol - e.g. 'BTC', 'BNB'
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
   * Fetch giá vàng từ vang.today
   * @param {string} typeCode - 'SJL1L10' (SJC VN) hoặc 'XAUUSD' (world)
   * @param {'buy'|'sell'} side - lấy giá mua hay bán
   * @returns {number|null}
   */
  async _fetchVangToday(typeCode, side = 'sell') {
    const cacheKey = `vang.today:${typeCode}:${side}`;
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const url = `${PRICE_CONFIG.GOLD.vangTodayApi}?type=${typeCode}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) return null;
      const item = data.data[0];
      const price = parseFloat(item[side] || item.buy || 0);
      if (price > 0) {
        this._setCache(cacheKey, price);
        return price;
      }
      return null;
    } catch (err) {
      console.error(`[PriceUpdater] vang.today "${typeCode}" fetch error:`, err);
      return null;
    }
  }

  /**
   * Fetch giá vàng SJC/DOJI trong nước (VND/lượng)
   * @returns {number|null}
   */
  async fetchVnGoldPrice() {
    return this._fetchVangToday(PRICE_CONFIG.GOLD.sjcCode, 'sell');
  }

  /**
   * Fetch giá vàng thế giới (USD/troy oz)
   * @returns {number|null}
   */
  async fetchGoldPriceUsd() {
    // vang.today XAUUSD trả về price trong trường 'buy' (USD/oz)
    const price = await this._fetchVangToday(PRICE_CONFIG.GOLD.xauCode, 'buy');
    if (price !== null) return price;
    // Fallback: metals.live
    try {
      const res = await fetch('https://api.metals.live/v1/spot/gold');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const p = typeof d.gold === 'number' ? d.gold : (typeof d[0]?.price === 'number' ? d[0].price : null);
      if (p !== null) { this._setCache('gold:XAU_USD', p); return p; }
    } catch (_) {}
    return null;
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
      const res = await fetch(`${PRICE_CONFIG.USD.api}${PRICE_CONFIG.USD.endpoint}`);
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

  // ─────────────────────────────────────────────
  // CORE: Update single investment item
  // Dựa vào priceSource được tự động gán từ asset catalog, không cần DOM
  // ─────────────────────────────────────────────

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

        case 'gold_vn': {
          // Vàng trong nước: VND/lượng → trực tiếp sử dụng không cần chuyển đổi
          newPrice = await this.fetchVnGoldPrice();
          // Nếu item tính theo USD, chuyển đổi ngược
          if (newPrice !== null && item.isUsd && usdRate > 0) {
            newPrice = newPrice / usdRate;
          }
          break;
        }

        case 'gold_world': {
          // Vàng thế giới: USD/troy oz
          const priceUsdPerOz = await this.fetchGoldPriceUsd();
          if (priceUsdPerOz !== null) {
            newPrice = item.isUsd ? priceUsdPerOz : priceUsdPerOz * usdRate;
          }
          break;
        }

        case 'usd': {
          newPrice = await this.fetchUsdRate();
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
      // Nếu chưa có priceSource, gán manual
      if (!inv.priceSource) {
        return {
          ...inv,
          priceSource: {
            type: 'manual',
            symbol: null,
            refreshInterval: 86400,
            lastUpdated: new Date(0).toISOString(),
            fetchStatus: 'pending'
          }
        };
      }
      // Migration: old 'gold' type → gold_vn hoặc gold_world
      if (inv.priceSource.type === 'gold') {
        const isVn = inv.priceSource.goldUnit === 'tael' || !inv.isUsd;
        inv.priceSource = {
          ...inv.priceSource,
          type: isVn ? 'gold_vn' : 'gold_world',
          lastUpdated: new Date(0).toISOString(), // force refresh
        };
        delete inv.priceSource.goldUnit;
      }
      return inv;
    });
  }
}

// ─────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────
const priceUpdater = new PriceUpdater();
