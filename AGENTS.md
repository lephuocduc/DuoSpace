# DuoSpace — Project Guidelines & Agent Rules

## 1. Kiến trúc hệ thống
- **Frontend (Static):** Deploy trên GitHub Pages (`https://lephuocduc.github.io/DuoSpace/`), gồm `index.html`, `css/`, và các file JS thuần trong `js/` (không bundler).
- **Backend & Database:** Cloudflare Worker + D1 (`cloudflare-d1/worker.js`, `duospace-db`, URL `https://duospace-api.duc-todo-api.workers.dev`).
- **Auth:** Firebase Google Auth (Whitelist 2 tài khoản Đức & Sương).

## 2. Quy tắc bắt buộc cho Cloudflare D1 & CloudSync (Gói Free — 100k writes/ngày)
- **KHÔNG BAO GIỜ trigger `save()` / `debouncePushToCloud()` trong lúc `app.init()`:**
  - Giữ cờ `this._isInitializing = true` trong `js/main.js` suốt quá trình khởi tạo & `render()` ban đầu, để `recordDailyNetWorth()` hay các hàm tự động không đẩy ngược state local lên Cloud trước khi `pullFromCloud()` chạy.
  - Chỉ gọi `save()` khi dữ liệu thực sự thay đổi (so sánh giá trị cũ/mới trước khi lưu).
- **Chống nhân bản bản ghi tuyệt đối trên D1:**
  - Mọi bảng đồng bộ (`investments`, `notes`, `system_logs`, `todos`, `bike_maintenances`...) **bắt buộc phải trả về `id` ở `GET /api/sync` và dùng `id` cố định** (không sinh `Math.random()` mới mỗi lần sync cho bản ghi đã tồn tại).
  - Với `investments` và `notes`: lọc trùng theo tên/`id` và đồng bộ cả thao tác xóa.
  - Với `system_logs`: mọi bản ghi tạo mới trong `js/modules/log.js` phải có `id` duy nhất và được chống trùng khi sync.
- **Bảo toàn dữ liệu khi sửa `CloudSync`:**
  - Kiểm tra kỹ vòng lặp `pullFromCloud()` ↔ `pushToCloud()` để tránh ghi đè dữ liệu mới trên Cloud hoặc spam write vượt hạn mức `100.000 rows written/ngày`.

## 3. Quy tắc nghiệp vụ DuoSpace
- **Tài sản đầu tư (`js/modules/investment.js`, `js/priceUpdater.js`):**
  - **Vàng trong nước (`Vàng DOJI / SJC (VND/chỉ)`):** Số lượng và giá tính theo **chỉ** (chia 10 từ giá VND/lượng lấy từ `vang.today`).
  - **Bạc trong nước (`Bạc DOJI (VND/lượng)`):** Số lượng và giá tính theo **lượng**, lấy giá live chính thức từ `banggia.doji.vn` (mã `14` — `BẠC DOJI 99.9 - 1 LƯỢNG`) qua Worker endpoint `/api/prices/silver`.
  - Khi thêm tài sản mới: **không hiện ô nhập giá thị trường**, hệ thống tự cập nhật giá ngầm để tính lời/lỗ và **không hiện alert/thông báo khi lấy giá thành công**.
  - Thẻ tài sản chỉ giữ nút **Lịch sử mua bán** (không thêm lại các nút thừa trên card).
  - Biểu đồ biến động tổng tài sản (`recordDailyNetWorth`) tự động dựng các mốc ngày giao dịch trong quá khứ theo thứ tự thời gian.
- **Xe máy (`js/modules/motorbike.js`):**
  - Ghi nhận bảo dưỡng **không bắt buộc nhập chi phí** (để trống = `0`).
  - Ô **Số ODO** và **Chi phí** định dạng dấu chấm phân chia phần nghìn (`Utils.formatNumberInput`).
  - Lịch sử bảo dưỡng sắp xếp **ngày mới nhất lên đầu** và hỗ trợ lọc `Tất cả` / `NMAX` / `Grande`.
  - Hỗ trợ hạng mục **Lọc bụi nồi** (`cvt_dust_filter`) và tránh trùng từ khóa `"nồi"` với `belt_roller`.

## 4. Quy trình kiểm thử, Cache-busting & Deploy
- **Unit test:** Luôn viết/cập nhật unit test trong `tests/` và chạy `npm test` (dùng `node:test`, không cài thêm thư viện test ngoài) đảm bảo **100% pass** trước khi commit.
- **Cache-busting cho GitHub Pages:** Mỗi khi sửa file trong `js/`, cập nhật query `?v=...` tương ứng trong `index.html`.
- **Deploy Worker:** Nếu có sửa `cloudflare-d1/worker.js`, chạy `cd cloudflare-d1 && npx wrangler deploy`.
- **Git:** Repo cấu hình sẵn `credential.https://github.com.username = lephuocduc` để push thẳng lên `origin main`.
