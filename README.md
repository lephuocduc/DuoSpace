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

Chỉ cần mở trực tiếp file `index.html` trên bất kỳ trình duyệt hiện đại nào (Chrome, Safari, Edge, Firefox) hoặc chạy thông qua Live Server/GitHub Pages mà không cần cài đặt môi trường build phức tạp.
