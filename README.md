# DuoSpace 👫

**DuoSpace** là ứng dụng web cá nhân & quản lý gia đình dành cho 2 người (Phước Đức & Thu Sương), giúp theo dõi công việc chung, thu chi, danh mục đầu tư, lịch sử bảo dưỡng xe và sức khỏe thú cưng.

---

## 🌟 Tính năng chính

- 🏠 **Tổng quan (Home)**: Thống kê Quỹ chung hàng tháng, so sánh Thu - Chi, tiến độ hoàn thành To-Do và nhắc nhở việc quan trọng.
- 📝 **To-Do List**: Quản lý danh sách việc cần làm, phân công theo người (Đức / Sương / Cả hai), mức độ ưu tiên và lọc theo mốc thời gian.
- 💰 **Quản lý Thu Chi (Finance)**: Ghi chép chi tiêu theo danh mục, người chi trả và thống kê số dư quỹ chung.
- 📈 **Quản lý Đầu tư (Investment)**: Theo dõi danh mục tài sản (Crypto, Cổ phiếu, Vàng, USD, Tiết kiệm), tự động cập nhật tỷ giá USD/VNĐ theo thời gian thực và biểu đồ phân bổ tài sản.
- 🛵 **Xe Máy (Motorbike)**: Theo dõi chỉ số Odo và lịch sử bảo dưỡng định kỳ cho 2 xe (NMAX & Grande).
- 🐱 **Mun & Bông (Cats)**: Nhật ký theo dõi và biểu đồ biến động cân nặng của 2 bé mèo.
- 🏸 **Sức Khỏe (Health)**: Nhắc nhở tập luyện chạy bộ, cầu lông và theo dõi sức khỏe.
- ⚙️ **Cài đặt & Giao diện**: Tự động hỗ trợ Dark Mode / Light Mode và lưu trữ dữ liệu an toàn trên LocalStorage.

---

## 📁 Cấu trúc dự án

```
duospace/
├── index.html              # Giao diện chính (Shell HTML)
├── css/
│   └── custom.css          # Tùy chỉnh CSS & animations
├── js/
│   ├── config.js           # Cấu hình hằng số & categories
│   ├── utils.js            # Các hàm tiện ích
│   ├── storage.js          # Quản lý LocalStorage & schema
│   ├── main.js             # Entry point khởi động ứng dụng
│   ├── ui/                 # Module điều khiển giao diện (Theme, Tabs, Sidebar, Modal)
│   ├── charts/             # Module biểu đồ Chart.js (Budget, Weight, Investment)
│   └── modules/            # Logic nghiệp vụ theo từng tính năng
└── data/
    └── schema.json         # Cấu trúc tài liệu dữ liệu JSON
```

---

## 🚀 Hướng dẫn sử dụng

Mở trực tiếp file `index.html` trên bất kỳ trình duyệt hiện đại nào (Chrome, Safari, Edge, Firefox) hoặc chạy qua Live Server/GitHub Pages.

Để lấy giá DOJI trực tiếp từ bảng giá đã render, mở thêm một terminal tại thư mục dự án và chạy:

```bash
npm install
npm run doji-server
```

Sau khi server báo sẵn sàng ở cổng `3001`, ứng dụng sẽ tự gọi `http://127.0.0.1:3001/api/gold/doji`. Server này chạy Puppeteer, đợi bảng giá Angular của DOJI tải xong và lấy giá mua của “Nhẫn tròn 9999 Hưng Thịnh Vượng”.

## 💾 Sao lưu và khôi phục

Vào **Cài đặt → Dữ liệu & sao lưu** để tải toàn bộ dữ liệu thành tệp JSON hoặc khôi phục từ một bản sao lưu trước đó. Khôi phục sẽ thay thế dữ liệu hiện có. Tại đây cũng có nút xuất toàn bộ thu chi thành tệp CSV, có thể mở bằng Excel hoặc Google Sheets.

## 🔐 Cấu hình Google Authentication (Firebase Auth)

DuoSpace được tích hợp Google Authentication qua Firebase để bảo vệ dữ liệu, kèm cơ chế Whitelist chỉ cho phép đúng 2 tài khoản của Đức và Sương:

1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một Project mới.
2. Vào **Build → Authentication → Sign-in method**, bấm **Add new provider** và chọn **Google**, sau đó bật **Enable**.
3. Vào **Project Settings (biểu tượng bánh răng) → General → Your apps**, thêm Web app (`</>`) để lấy mã cấu hình `firebaseConfig`.
4. Mở file [js/authConfig.js](file:///g:/My%20Drive/L%C3%AA%20Ph%C6%B0%E1%BB%9Bc%20%C4%90%E1%BB%A9c/Personal%20App/js/authConfig.js):
   - Dán `firebaseConfig` của bạn vào `firebaseConfig`.
   - Cập nhật đúng địa chỉ Gmail của Đức và Sương trong mảng `allowedUsers`.
5. Nếu chạy trên tên miền riêng hoặc `localhost`, đảm bảo domain đã được thêm vào **Authentication → Settings → Authorized domains**.

## 🛠 Khắc phục sự cố

- Không thấy dữ liệu cũ: kiểm tra trình duyệt có đang chặn LocalStorage hoặc đang dùng cửa sổ ẩn danh không.
- Báo lỗi "Tài khoản không có quyền truy cập": Kiểm tra địa chỉ Gmail đăng nhập đã được thêm chính xác vào `allowedUsers` trong `js/authConfig.js` chưa.

- Không cập nhật được tỷ giá/giá tài sản: ứng dụng vẫn dùng giá đã lưu; thử lại khi có Internet.
- Trước khi xóa hoặc khôi phục dữ liệu lớn: hãy tải một bản sao lưu JSON trong **Cài đặt**.
