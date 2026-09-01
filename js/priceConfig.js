/**
 * DuoSpace - Price Auto-Updater Configuration
 * Định nghĩa các nguồn giá và mapping symbol cho từng loại tài sản
 */
const PRICE_CONFIG = {
  // --- Crypto: CoinGecko Free API ---
  CRYPTO: {
    api: 'https://api.coingecko.com/api/v3',
    endpoint: '/simple/price',
    refreshInterval: 3600, // 1 giờ
    // Map symbol → CoinGecko ID
    mapping: {
      'BTC':  'bitcoin',
      'ETH':  'ethereum',
      'XRP':  'ripple',
      'BNB':  'binancecoin',
      'SOL':  'solana',
      'ADA':  'cardano',
      'DOGE': 'dogecoin',
      'DOT':  'polkadot',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI':  'uniswap',
      'LTC':  'litecoin',
      'BCH':  'bitcoin-cash',
      'ATOM': 'cosmos',
      'SUI':  'sui',
      'TON':  'the-open-network',
      'PEPE': 'pepe',
    }
  },

  // --- Gold: Metals.live Free API ---
  GOLD: {
    api: 'https://api.metals.live/v1/spot',
    endpoint: '/gold',
    refreshInterval: 86400, // 1 ngày
    // Trả về USD/troy oz. 1 tael VN ≈ 37.5g, 1 troy oz ≈ 31.1g
    // 1 lượng = 37.5g = 1.2057 troy oz
    taelToOz: 1.2057,
    // Đơn vị trọng lượng cho vàng VN: 'tael' hoặc 'oz'
  },

  // --- USD/VND: Open Exchange Rates (đã dùng) ---
  USD: {
    api: 'https://open.er-api.com/v6/latest',
    endpoint: '/USD',
    refreshInterval: 3600, // 1 giờ
  },

  // --- Stock: Alpha Vantage (cần API key) ---
  STOCK: {
    api: 'https://www.alphavantage.co/query',
    refreshInterval: 86400, // 1 ngày (free tier: 500 calls/day)
    // apiKey được lấy từ localStorage 'avApiKey' qua Settings
  },

  // --- Refresh interval options cho dropdown ---
  REFRESH_OPTIONS: [
    { value: 1800,   label: 'Mỗi 30 phút' },
    { value: 3600,   label: 'Mỗi giờ' },
    { value: 21600,  label: 'Mỗi 6 giờ' },
    { value: 86400,  label: 'Mỗi ngày' },
    { value: 604800, label: 'Mỗi tuần' },
  ],

  // Khoảng thời gian polling để check xem có asset nào cần refresh không (ms)
  AUTO_CHECK_INTERVAL: 5 * 60 * 1000, // 5 phút
};
