# Hướng dẫn Thiết lập và Triển khai Cloudflare D1 cho DuoSpace

Tài liệu này hướng dẫn từng bước thiết lập Cloudflare D1 Database và Cloudflare Worker REST API để đồng bộ dữ liệu ứng dụng DuoSpace cho cả 2 bạn.

---

## 1. Yêu cầu chuẩn bị
- Đã cài đặt [Node.js](https://nodejs.org/) trên máy tính.
- Đã có tài khoản miễn phí [Cloudflare](https://dash.cloudflare.com/).

---

## 2. Các bước thiết lập Cloudflare D1

### Bước 2.1: Mở Terminal tại thư mục `cloudflare-d1`
Mở PowerShell hoặc Command Prompt và chuyển vào thư mục:
```bash
cd "cloudflare-d1"
```

### Bước 2.2: Đăng nhập Cloudflare bằng Wrangler CLI
```bash
npx wrangler login
```
*(Trình duyệt sẽ mở ra, bạn chỉ cần bấm **Authorize / Cho phép** để đăng nhập).*

### Bước 2.3: Tạo D1 Database mới
Chạy lệnh sau để tạo database tên `duospace-db`:
```bash
npx wrangler d1 create duospace-db
```
Sau khi tạo xong, terminal sẽ hiển thị thông tin dạng:
```toml
[[d1_databases]]
binding = "DB"
database_name = "duospace-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
👉 Bạn hãy sao chép `database_id` này và dán vào file `cloudflare-d1/wrangler.toml`.

---

## 3. Khởi tạo Bảng dữ liệu (Schema & Seed)

### Bước 3.1: Chạy file schema tạo cấu trúc bảng trên Cloud
```bash
npx wrangler d1 execute duospace-db --remote --file=./schema.sql
```

### Bước 3.2: (Tùy chọn) Chèn dữ liệu mẫu ban đầu
```bash
npx wrangler d1 execute duospace-db --remote --file=./seed.sql
```

---

## 4. Deploy API Worker lên Cloudflare

Chạy lệnh deploy API:
```bash
npx wrangler deploy
```
Sau khi deploy thành công, terminal sẽ cung cấp URL công khai của Worker, ví dụ:
`https://duospace-api.<your-subdomain>.workers.dev`

---

## 5. Kết nối ứng dụng DuoSpace với API Worker

Mở file `js/config.js`, thêm thuộc tính `D1_API_URL`:
```javascript
const CONFIG = {
  APP_VERSION: '3.1',
  STORAGE_KEY: 'duoSpaceData',
  USD_RATE_API: 'https://open.er-api.com/v6/latest/USD',
  // Dán đường link Worker của bạn vào đây:
  D1_API_URL: 'https://duospace-api.<your-subdomain>.workers.dev',
  ...
};
```

Khi có URL này:
- Ứng dụng sẽ tự động tải dữ liệu từ Cloudflare D1 mỗi khi mở app.
- Mọi thay đổi (thêm chi tiêu, việc cần làm, ghi chú...) sẽ được lưu tức thì vào LocalStorage đồng thời đồng bộ ngầm lên Cloudflare D1!
