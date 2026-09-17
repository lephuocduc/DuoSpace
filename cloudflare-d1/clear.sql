-- Lệnh xóa sạch toàn bộ dữ liệu tạm trên Cloudflare D1
DELETE FROM todos;
DELETE FROM transactions;
DELETE FROM investments;
DELETE FROM net_worth_history;
DELETE FROM monthly_budgets;
DELETE FROM cat_weights;
DELETE FROM bike_maintenances;

-- Đặt lại app state mặc định ban đầu
INSERT OR REPLACE INTO app_state (id, usd_rate, settings_json, updated_by)
VALUES (
    'duospace_global_state',
    25400,
    '{"munBreed":"Mèo Cưng","bongBreed":"Mèo Cưng","nmaxPlate":"50AD-539.09","nmaxOdo":0,"grandePlate":"50N2-461.30","grandeOdo":0}',
    'Đ'
);
