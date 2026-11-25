/**
 * DuoSpace - Price Updater Module
 * Tự động fetch & cập nhật giá tài sản từ nhiều nguồn API khác nhau.
 * Có in-memory cache để tránh gọi API quá nhiều.
 *
 * v4.0: Bỏ cấu hình thủ công nguồn giá & mã tài sản.
 *       Hệ thống tự động suy luận nguồn giá dựa trên tên tài sản từ catalog.
 *       Gold API: vang.today (DOJINHTV / DOHNL / SJL1L10 / XAUUSD, CORS OK), with local Puppeteer fallback.
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
   * @param {string} typeCode - 'DOJINHTV' (DOJI Nhẫn HTV), 'DOHNL' (DOJI HN), 'SJL1L10' (SJC VN), hoặc 'XAUUSD' (world)
   * @param {'buy'|'sell'} side - lấy giá mua hay bán
   * @returns {number|null}
   */
  async _fetchVangToday(typeCode, side = 'buy') {
    if (!typeCode) return null;
    const cacheKey = `vang.today:${typeCode}:${side}`;
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const url = `${PRICE_CONFIG.GOLD.vangTodayApi}?type=${encodeURIComponent(typeCode)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.success) return null;

      // vang.today returns a flat object { success, type, name, buy, sell, ... }
      // Also support legacy { data: [...] } or { prices: { [typeCode]: {...} } } formats.
      const item = Array.isArray(data.data)
        ? data.data[0]
        : (data.prices?.[typeCode] || data);
      if (!item) return null;

      const altSide = side === 'buy' ? 'sell' : 'buy';
      const price = parseFloat(item[side] || item[altSide] || 0);
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
   * Fetch giá vàng DOJI trong nước.
   * Ưu tiên vang.today (DOJINHTV -> DOHNL -> SJL1L10), fallback sang local Puppeteer scraper nếu có.
   * @param {'chi'|'tael'} unit - 'chi' (VND/chỉ, mặc định) hoặc 'tael' (VND/lượng)
   * @returns {number|null}
   */
  async fetchVnGoldPrice(unit = 'chi') {
    const chiPerTael = PRICE_CONFIG.GOLD.chiPerTael || 10;
    const convertUnit = (pricePerTael) => (unit === 'tael' ? pricePerTael : Math.round(pricePerTael / chiPerTael));

    const cacheKey = 'gold:DOJI_NHAN_9999_TAEL';
    const cached = this._getCached(cacheKey);
    if (cached !== null) return convertUnit(cached);

    // 1. Primary: vang.today API (HTTPS + CORS OK, hoạt động trực tiếp trên trình duyệt)
    const codes = [
      PRICE_CONFIG.GOLD.dojiCode || 'DOJINHTV',
      PRICE_CONFIG.GOLD.dojiFallbackCode || 'DOHNL',
      PRICE_CONFIG.GOLD.sjcCode || 'SJL1L10',
    ];
    for (const code of codes) {
      const price = await this._fetchVangToday(code, 'buy');
      if (price !== null && price >= 10000000 && price <= 500000000) {
        this._setCache(cacheKey, price);
        return convertUnit(price);
      }
    }

    // 2. Fallback: local Puppeteer DOJI scraper (chỉ dùng khi chạy local dev với npm run doji-server)
    try {
      const res = await fetch(PRICE_CONFIG.GOLD.dojiScraperApi, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const gold = data.results?.[0];
      if (!gold) throw new Error('Không có dữ liệu vàng DOJI');

      const rawPrice = gold.buy ?? gold.buyPrice ?? gold.buy_price ?? gold.gia_mua ??
        gold.purchase ?? gold.purchase_price ?? gold.sell ?? gold.sellPrice ?? gold.sell_price;
      let price = typeof rawPrice === 'number'
        ? rawPrice
        : Number(String(rawPrice || '').replace(/[^0-9]/g, ''));
      // DOJI displays thousand VND, e.g. 130.000.
      if (price > 0 && price < 10000000) price *= 1000;
      if (price >= 10000000 && price <= 500000000) {
        this._setCache(cacheKey, price);
        return convertUnit(price);
      }
      throw new Error('Giá DOJI không hợp lệ');
    } catch (err) {
      console.warn('[PriceUpdater] DOJI scraper fallback error:', err);
    }

    return null;
  }

  /**
   * Fetch giá vàng thế giới (USD/troy oz)
   * Ưu tiên vang.today (XAUUSD), fallback chartgoldprice.com và metals.live
   * @returns {number|null} - USD/troy oz
   */
  async fetchGoldPriceUsd() {
    const cacheKey = 'gold:XAU_USD';
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    // 1. Primary: vang.today XAUUSD
    const vtPrice = await this._fetchVangToday(PRICE_CONFIG.GOLD.xauCode || 'XAUUSD', 'buy');
    if (vtPrice !== null && vtPrice > 500 && vtPrice < 20000) {
      this._setCache(cacheKey, vtPrice);
      return vtPrice;
    }

    // 2. Fallback: chartgoldprice.com — path: data.prices.gold.troy_ounce
    try {
      const url = PRICE_CONFIG.GOLD.chartGoldPriceApi || 'https://www.chartgoldprice.com/api/data';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const price =
          data?.prices?.gold?.troy_ounce ??
          (data?.prices?.gold?.gram ? data.prices.gold.gram * 31.1035 : null) ??
          (typeof data.price === 'number' ? data.price : null);
        if (price !== null && price > 500 && price < 20000) {
          console.log('[PriceUpdater] XAU/USD (chartgoldprice.com):', price);
          this._setCache(cacheKey, price);
          return price;
        }
      }
    } catch (err) {
      console.warn('[PriceUpdater] chartgoldprice.com fetch error:', err);
    }

    // 3. Fallback: metals.live
    try {
      const res = await fetch('https://api.metals.live/v1/spot/gold');
      if (res.ok) {
        const d = await res.json();
        const p = typeof d.gold === 'number' ? d.gold : (typeof d[0]?.price === 'number' ? d[0].price : null);
        if (p !== null) { this._setCache(cacheKey, p); return p; }
      }
    } catch (_) {}

    return null;
  }

  /**
   * Fetch giá bạc trong nước (VND/lượng).
   * Ưu tiên Cloudflare Worker (/api/prices/silver - lấy giá trực tiếp từ Phú Quý/giabac.vn),
   * fallback sang CoinGecko KAG (realtime) rồi currency-api (XAG/VND × 1.2057).
   * @returns {number|null}
   */
  async fetchVnSilverPrice() {
    const cacheKey = 'silver:VN_TAEL_VND';
    const cached = this._getCached(cacheKey);
    if (cached !== null) return cached;

    const cfg = PRICE_CONFIG.SILVER || {};
    const taelToOz = cfg.taelToOz || 1.2057;
    const isValidSilverTael = (p) => typeof p === 'number' && !isNaN(p) && p >= 100000 && p <= 50000000;

    // 1. Primary: Cloudflare Worker live Vietnam domestic silver price (banggia.doji.vn)
    // Retry 1 lần nếu gặp lỗi mạng thoáng qua để tránh rơi xuống giá bạc thế giới thấp hơn giá DOJI.
    const workerBase = (typeof CONFIG !== 'undefined' && CONFIG.D1_API_URL) ? CONFIG.D1_API_URL.replace(/\/$/, '') : '';
    const workerUrl = cfg.workerApi || (workerBase && cfg.workerEndpoint ? `${workerBase}${cfg.workerEndpoint}` : '');
    if (workerUrl) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(workerUrl);
          if (res.ok) {
            const data = await res.json();
            const price = Number(data?.buy || data?.sell || data?.price || 0);
            if (isValidSilverTael(price)) {
              this._setCache(cacheKey, price);
              return price;
            }
          }
        } catch (err) {
          console.warn(`[PriceUpdater] Silver worker API error (attempt ${attempt + 1}):`, err);
        }
      }
    }

    // 2. Fallback 1: CoinGecko Kinesis Silver (1 KAG = 1 troy oz physical silver, realtime)
    try {
      const id = cfg.coingeckoId || 'kinesis-silver';
      const url = `${PRICE_CONFIG.CRYPTO.api}${PRICE_CONFIG.CRYPTO.endpoint}?ids=${encodeURIComponent(id)}&vs_currencies=vnd`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const vndPerOz = Number(data?.[id]?.vnd);
        if (vndPerOz > 0) {
          const pricePerTael = Math.round((vndPerOz * taelToOz) / 1000) * 1000;
          if (isValidSilverTael(pricePerTael)) {
            this._setCache(cacheKey, pricePerTael);
            return pricePerTael;
          }
        }
      }
    } catch (err) {
      console.warn('[PriceUpdater] Silver CoinGecko fallback error:', err);
    }

    // 3. Fallback 2: fawazahmed0 currency-api (XAG -> VND/oz -> VND/lượng)
    const currencyUrls = [
      cfg.currencyApi || 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json',
      cfg.currencyApiFallback || 'https://latest.currency-api.pages.dev/v1/currencies/xag.json',
    ];
    for (const url of currencyUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const vndPerOz = Number(data?.xag?.vnd);
        if (vndPerOz > 0) {
          const pricePerTael = Math.round((vndPerOz * taelToOz) / 1000) * 1000;
          if (isValidSilverTael(pricePerTael)) {
            this._setCache(cacheKey, pricePerTael);
            return pricePerTael;
          }
        }
      } catch (err) {
        console.warn(`[PriceUpdater] Silver currency-api (${url}) error:`, err);
      }
    }

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
          // Vàng trong nước: mặc định tính theo chỉ (VND/chỉ), giữ tương thích ngược nếu tài sản ghi rõ VND/lượng
          const isTael = item.unit === 'lượng' || (item.name || '').toLowerCase().includes('vnd/lượng');
          newPrice = await this.fetchVnGoldPrice(isTael ? 'tael' : 'chi');
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

        case 'silver_vn': {
          // Bạc DOJI trong nước: VND/lượng
          newPrice = await this.fetchVnSilverPrice();
          if (newPrice !== null && item.isUsd && usdRate > 0) {
            newPrice = newPrice / usdRate;
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
      // Migration: gold_vn tính theo chỉ nhưng bị lưu nhầm giá theo lượng (>= 50tr/lượng) → chia 10 ra VND/chỉ
      if (inv.priceSource.type === 'gold_vn' && !inv.isUsd) {
        const isExplicitTael = inv.unit === 'lượng' || (inv.name || '').toLowerCase().includes('vnd/lượng');
        if (!isExplicitTael && typeof inv.currentPrice === 'number' && inv.currentPrice >= 50000000) {
          return {
            ...inv,
            unit: inv.unit || 'chỉ',
            currentPrice: Math.round(inv.currentPrice / (PRICE_CONFIG.GOLD.chiPerTael || 10)),
            priceSource: {
              ...inv.priceSource,
              lastUpdated: new Date(0).toISOString(),
            }
          };
        }
      }
      return inv;
    });
  }
}

// ─────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────
const priceUpdater = new PriceUpdater();
