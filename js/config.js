/**
 * DuoSpace Configuration & Constants
 */
const CONFIG = {
  APP_VERSION: '3.1',
  STORAGE_KEY: 'duoSpaceData',
  USD_RATE_API: 'https://open.er-api.com/v6/latest/USD',

  VEHICLES: {
    NMAX: { plate: '50AD-539.09', chassis: 'RLCSGB310TY001107' },
    Grande: { plate: '50N2-461.30', chassis: 'RLCSEK410NY006766' },
  },

  // Categories definition
  CATEGORIES: {
    TODO: ['Việc nhà', 'Mun & Bông', 'Xe Máy', 'Sức Khỏe'],
    EXPENSE: [
      '🍜 Ăn uống',
      '🏠 Nhà cửa',
      '🛒 Siêu thị',
      '🛵 Xe',
      '🐱 Mèo',
      '💊 Sức khỏe',
      '🎮 Giải trí',
      '💰 Tiết kiệm',
      '💼 Đầu tư',
      '📦 Khác'
    ],
    INVESTMENT: [
      '🪙 Crypto',
      '📈 Cổ phiếu',
      '🥇 Vàng',
      '💵 USD',
      '🏦 Tiết kiệm',
      '💼 Khác'
    ]
  },

  PRIORITIES: [
    { value: 'high', label: '🔴 Cao' },
    { value: 'medium', label: '🟡 Trung bình' },
    { value: 'low', label: '⚪ Thấp' }
  ],

  USERS: {
    D: { name: 'Phước Đức', short: 'Đức', symbol: 'Đ' },
    S: { name: 'Thu Sương', short: 'Sương', symbol: 'S' },
    Both: { name: 'Cả hai', short: 'Cả hai', symbol: 'Both' }
  }
};
