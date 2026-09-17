# DuoSpace 👫

**DuoSpace** là ứng dụng web cá nhân & quản lý gia đình dành riêng cho 2 người (**Phước Đức & Thu Sương**), giúp tổ chức công việc chung, theo dõi tài chính thu chi, danh mục đầu tư, sức khỏe cá nhân, bảo dưỡng xe máy và mèo cưng với khả năng lưu trữ cục bộ (Local-First) kết hợp đồng bộ hóa đám mây **Cloudflare D1**.

---

## 🌟 Tính năng chính

### 1. 🔐 Bảo mật & Xác thực (Google Firebase Auth)
- **Đăng nhập Google an toàn:** Xác thực người dùng qua Google OAuth bằng Firebase Authentication.
- **Bảo vệ bằng danh sách Whitelist:** Chỉ cấp phép truy cập cho đúng 2 email của Đức (`leducst1@gmail.com`) và Sương (`suongtranst1@gmail.com`).
- **Màn hình khởi động thông minh:** Tự động kiểm tra phiên đăng nhập nền và phản hồi trạng thái kết nối rõ ràng.

### 2. ☁️ Đồng bộ Cloudflare D1 (Local-First + Cloud Sync)
- **Lưu trữ tức thì:** Dữ liệu ưu tiên ghi vào `LocalStorage` của trình duyệt giúp ứng dụng phản hồi mượt mà và hoạt động cả khi mất mạng tạm thời.
- **Tự động đồng bộ lên D1:** Mọi thay đổi dữ liệu sẽ được tự động đồng bộ lên cơ sở dữ liệu serverless Cloudflare D1.
- **Xác thực API bằng ID Token:** Cloudflare Worker xác thực trực tiếp JWT RS256 của Google JWKS, ngăn chặn mọi truy cập trái phép.
- **Nút Đồng bộ thủ công (Sync Button):** Biểu tượng đám mây ở header cho phép bấm trực tiếp để ép tải dữ liệu mới nhất bất cứ lúc nào.

### 3. 📝 Quản lý Công việc (To-Do List)
- **Phân loại đa dạng:** Việc nhà, Mun & Bông, Xe Máy, Sức Khỏe, Đầu tư và **Khác**.
- **Phân công linh hoạt:** Giao việc cho Đức, Sương hoặc Cả hai.
- **Mốc thời gian:** Hỗ trợ **Ngày bắt đầu** và **Hạn hoàn thành (Deadline)**.
- **Cảnh báo quá hạn:** Tự động bật nhãn đỏ cảnh báo `(Quá hạn)` nếu công việc chưa hoàn thành sau thời hạn.

### 4. 💰 Quản lý Tài chính & Thu Chi (Finance)
- **Ghi chép giao dịch:** Ghi nhận chi tiêu và thu nhập theo danh mục và người chi trả. Sắp xếp thông minh: giao dịch mới nhất luôn ở trên cùng.
- **Bộ lọc khoảng ngày mạnh mẽ:** Lọc nhanh theo "Tháng này", "Tháng trước", "30 ngày qua", "Năm nay" hoặc tự chọn khoảng ngày tùy ý.
- **Biểu đồ so sánh Thu - Chi:** Trực quan hóa dòng tiền 3 tháng gần nhất với trục Y co giãn tự động theo số liệu thực tế.

### 5. 📈 Quản lý Đầu tư & Tài sản (Investment)
- **Đa dạng danh mục:** Theo dõi Crypto (BTC, BNB...), Vàng nhẫn 9999, Tiền mặt USD, VND, Tiền gửi tiết kiệm.
- **Tự động cập nhật tỷ giá:** Tích hợp API lấy giá Coin theo thời gian thực và crawler giá vàng DOJI.
- **Bán tài sản & chốt lời:** Hỗ trợ bán từng phần, tính lãi/lỗ tự động và ghi nhận thu nhập vào quỹ chung.

### 6. ❤️ Sức Khỏe Cá Nhân (Health)
- Ghi nhận định kỳ **Cân nặng (kg)** và **Chiều cao (cm)** của Đức & Sương.
- Tự động tính chỉ số **BMI** và phân loại thể trạng (Gầy, Bình thường, Thừa cân nhẹ, Cần giảm cân) kèm ghi chú thể lực.
- Lịch sử theo dõi rõ ràng, hỗ trợ xóa và cập nhật chỉ số nhanh chóng.

### 7. 🛵 Xe Máy & 🐱 Mèo Cưng
- **Xe máy (NMAX & Grande):** Quản lý ODO hiện tại và tuổi thọ các phụ tùng cần bảo dưỡng định kỳ (Nhớt máy, nhớt láp, lọc gió, bugi, dây curoa...).
- **Mun & Bông:** Theo dõi cân nặng hàng tháng của 2 bé mèo với biểu đồ tăng trưởng trực quan.

### 8. 💾 Sao lưu & Khôi phục (Backup & Restore)
- Xuất toàn bộ cơ sở dữ liệu ra file backup **JSON**.
- Khôi phục từ file JSON với tính năng tự động đẩy dữ liệu khôi phục lên Cloudflare D1.
- Xuất lịch sử thu chi ra file **Excel (CSV)**.

---

## 📁 Cấu trúc thư mục

```
duospace/
├── index.html              # Giao diện chính (Shell HTML)
├── css/
│   └── custom.css          # Tùy chỉnh CSS, animations & scroll lock
├── js/
│   ├── config.js           # Hằng số cấu hình hệ thống & categories
│   ├── authConfig.js       # Cấu hình Firebase Auth & Whitelist email
│   ├── utils.js            # Tiện ích định dạng, sanitize, thông báo, scroll lock
│   ├── storage.js          # Quản lý LocalStorage & schema
│   ├── main.js             # Khởi tạo DuoSpaceApp & bộ điều hướng
│   ├── ui/                 # Module điều khiển giao diện (Sidebar, Modal, Tabs)
│   ├── charts/             # Biểu đồ Chart.js (Budget, Cat weights, Investment)
│   └── modules/            # Module nghiệp vụ (Auth, CloudSync, Todo, Finance, Investment, Motorbike, Cats, Health, Settings, Log)
├── cloudflare-d1/          # Backend Serverless Cloudflare D1
│   ├── wrangler.toml       # Cấu hình Cloudflare Worker & D1 Database binding
│   ├── schema.sql          # Định nghĩa cấu trúc các bảng CSDL SQLite trên D1
│   └── worker.js           # Worker API xác thực Google JWT RS256 và CRUD sync
└── server/
    └── doji-server.js      # Server crawler bảng giá vàng DOJI bằng Puppeteer
```

---

## 🚀 Hướng dẫn khởi chạy

### Chạy trực tiếp
Mở file `index.html` bằng **Live Server** (trong VS Code) hoặc chạy lệnh:
```bash
npx serve .
```
Truy cập `http://localhost:3000` trên trình duyệt.

> **Lưu ý:** Để Firebase Google Auth hoạt động đúng, không mở trực tiếp bằng đường dẫn `file:///` mà hãy chạy qua máy chủ web cục bộ (`http://localhost`).

### Crawl giá vàng DOJI (Tùy chọn)
Để cập nhật giá vàng nhẫn 9999 trực tiếp từ website DOJI:
```bash
npm install
npm run doji-server
```
Server sẽ chạy ở cổng `3001` và phục vụ API tại `http://127.0.0.1:3001/api/gold/doji`.

### Deploy Cloudflare Worker
Nếu cần cập nhật hoặc triển khai lại Worker API lên Cloudflare:
```bash
cd cloudflare-d1
npx wrangler deploy
```

---

## 🔐 Cấu hình Google Authentication (Firebase Auth)

1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo Project.
2. Vào **Build → Authentication → Sign-in method**, kích hoạt **Google provider**.
3. Tại **Project Settings → General → Your apps**, copy thông số `firebaseConfig`.
4. Mở file `js/authConfig.js`:
   - Dán thông số vào `firebaseConfig`.
   - Cấu hình email tại `allowedUsers` (mặc định: `leducst1@gmail.com` và `suongtranst1@gmail.com`).
5. Thêm domain chạy web (ví dụ `localhost`, `duc-todo.pages.dev`...) vào mục **Authorized domains** trong Firebase Authentication Settings.
