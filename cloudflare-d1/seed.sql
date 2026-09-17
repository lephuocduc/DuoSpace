-- Dữ liệu mẫu khởi tạo cho DuoSpace trên Cloudflare D1

INSERT OR REPLACE INTO app_state (id, usd_rate, settings_json, updated_by)
VALUES (
    'duospace_global_state',
    25400,
    '{"munBreed":"Mèo Cưng","bongBreed":"Mèo Cưng","nmaxPlate":"50AD-539.09","nmaxOdo":14850,"grandePlate":"50N2-461.30","grandeOdo":8200}',
    'Đ'
);

INSERT OR IGNORE INTO todos (id, title, category, user, priority, notes, done, date)
VALUES 
    ('todo-1', 'Lịch nhỏ mắt & tẩy giun Mun, Bông', 'Mun & Bông', 'S', 'high', 'Dùng thuốc nhỏ Revolution', 0, CURRENT_TIMESTAMP),
    ('todo-2', 'Thay nhớt NMAX mốc 15.000km', 'Xe Máy', 'Đ', 'medium', 'Thay nhớt máy Motul 10W40', 0, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO transactions (id, type, amount, description, category, user, notes, date)
VALUES
    ('trans-1', 'income', 15000000, 'Lương tháng 8', 'Lương', 'Đ', 'Thu nhập cố định', CURRENT_TIMESTAMP),
    ('trans-2', 'income', 12000000, 'Lương tháng 8', 'Lương', 'S', 'Thu nhập cố định', CURRENT_TIMESTAMP),
    ('trans-3', 'expense', 3200000, 'Ăn uống nhà hàng & chợ', '🍜 Ăn uống', 'S', '', CURRENT_TIMESTAMP),
    ('trans-4', 'expense', 4000000, 'Tiền điện nước internet', '🏠 Nhà cửa', 'Đ', '', CURRENT_TIMESTAMP),
    ('trans-5', 'expense', 800000, 'Xăng xe & bảo dưỡng', '🛵 Xe', 'Đ', '', CURRENT_TIMESTAMP),
    ('trans-6', 'expense', 600000, 'Cát vệ sinh & hạt mèo', '🐱 Mèo', 'S', '', CURRENT_TIMESTAMP),
    ('trans-7', 'expense', 3900000, 'Sắm đồ dùng gia đình', '📦 Khác', 'Đ', '', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO bike_maintenances (id, bike, title, odo, cost, date)
VALUES
    ('bike-1', 'NMAX', 'Thay nhớt', 14850, 350000, '2026-08-31'),
    ('bike-2', 'NMAX', 'Thay nhớt', 12100, 300000, '2026-05-15');

INSERT OR IGNORE INTO cat_weights (date, mun, bong)
VALUES
    ('2026-06-01', 4.0, 3.5),
    ('2026-07-01', 4.1, 3.6),
    ('2026-08-01', 4.2, 3.8);

INSERT OR IGNORE INTO monthly_budgets (month, budget, spent)
VALUES
    ('T6/2026', 15000000, 10200000),
    ('T7/2026', 14000000, 11800000),
    ('T8/2026', 12500000, 4200000);
