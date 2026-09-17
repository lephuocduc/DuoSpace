-- ==========================================================
-- DUOSPACE DATABASE SCHEMA - CLOUDFLARE D1 (SQLite Dialect)
-- ==========================================================

-- 1. Metadata / App Sync Info (Bảng theo dõi phiên bản đồng bộ và trạng thái chung)
CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,               -- e.g. 'duospace_global_state'
    usd_rate REAL DEFAULT 25400,
    settings_json TEXT,                -- Settings: { munBreed, bongBreed, nmaxPlate, nmaxOdo, etc. }
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT                    -- 'Đ' hoặc 'S' hoặc email người cập nhật gần nhất
);

-- 2. Công việc cần làm (Todos)
CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,               -- UUID hoặc client ID
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Khác',
    user TEXT NOT NULL,                -- 'Đ', 'S' hoặc 'Both'
    priority TEXT DEFAULT 'medium',    -- 'low', 'medium', 'high'
    notes TEXT,
    done INTEGER DEFAULT 0,            -- 0 (chưa xong) / 1 (đã xong)
    start_date DATE,                   -- Ngày bắt đầu
    due_date DATE,                     -- Hạn hoàn thành
    date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user);
CREATE INDEX IF NOT EXISTS idx_todos_done ON todos(done);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

-- 3. Giao dịch Thu Nhập & Chi Tiêu (Incomes & Expenses)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,                -- 'income' hoặc 'expense'
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT,                     -- '🍜 Ăn uống', '🏠 Nhà cửa', '🛵 Xe', '🐱 Mèo', etc.
    user TEXT NOT NULL,                -- 'Đ' hoặc 'S'
    notes TEXT,
    date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_trans_user ON transactions(user);

-- 4. Danh mục đầu tư & Tài sản (Investments)
CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                -- BTC, BNB, Vàng, USD...
    type TEXT NOT NULL,                -- '🪙 BTC', '💵 USD', '🟡 Vàng'...
    quantity REAL NOT NULL DEFAULT 0,
    buy_price REAL NOT NULL DEFAULT 0,
    current_price REAL NOT NULL DEFAULT 0,
    is_usd INTEGER DEFAULT 1,          -- 1: USD, 0: VND
    target_weight REAL DEFAULT 0,
    notes TEXT,
    purchases_json TEXT,               -- Mảng lịch sử mua [{ date, quantity, buyPrice, notes }]
    price_source_json TEXT,            -- Cấu hình API cập nhật giá { type, symbol, ... }
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Lịch sử biến động tài sản ròng (Net Worth History)
CREATE TABLE IF NOT EXISTS net_worth_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    value REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_networth_date ON net_worth_history(date);

-- 6. Ngân sách chi tiêu hàng tháng (Monthly Budgets)
CREATE TABLE IF NOT EXISTS monthly_budgets (
    month TEXT PRIMARY KEY,            -- 'T6/2026', 'T7/2026', ...
    budget REAL NOT NULL,
    spent REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lịch sử cân nặng mèo (Mun & Bông)
CREATE TABLE IF NOT EXISTS cat_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    mun REAL,
    bong REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cat_weights_date ON cat_weights(date);

-- 8. Nhật ký bảo dưỡng xe máy (Bike Maintenances)
CREATE TABLE IF NOT EXISTS bike_maintenances (
    id TEXT PRIMARY KEY,
    bike TEXT NOT NULL,                -- 'NMAX', 'Grande', ...
    title TEXT NOT NULL,               -- 'Thay nhớt máy', 'Bảo dưỡng phanh'...
    odo INTEGER NOT NULL,
    cost REAL DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bike_date ON bike_maintenances(date);

-- 9. Nhật ký hoạt động của hệ thống (System Logs)
CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    type TEXT DEFAULT 'system',
    date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_logs_date ON system_logs(date);

-- 10. Nhật ký sức khỏe & chỉ số cá nhân Đức & Sương (Health Logs)
CREATE TABLE IF NOT EXISTS health_logs (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,                -- 'Đ' hoặc 'S'
    date DATE NOT NULL,
    weight REAL,                       -- Cân nặng (kg)
    height REAL,                       -- Chiều cao (cm)
    water_ml INTEGER DEFAULT 0,        -- Lượng nước uống (ml)
    steps INTEGER DEFAULT 0,           -- Số bước chân
    notes TEXT,                        -- Ghi chú sức khỏe / triệu chứng
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_user_date ON health_logs(user, date);
