/**
 * DuoSpace Authentication Configuration
 * Cấu hình Firebase Authentication & Danh sách tài khoản được phép truy cập
 */
const AUTH_CONFIG = {
  // Thay thế các thông số bên dưới bằng thông số project Firebase của bạn
  // (Từ Firebase Console -> Project Settings -> General -> Your apps -> Web app)
  firebaseConfig: {
    apiKey: "AIzaSyCQNM2-SZwGhaSzoLFnsySZVEmkZfhSpb8",
    authDomain: "duospace-94616.firebaseapp.com",
    projectId: "duospace-94616",
    storageBucket: "duospace-94616.firebasestorage.app",
    messagingSenderId: "185096424537",
    appId: "1:185096424537:web:13a55bba327d9d224e7548",
    measurementId: "G-WLVYPC3NNE"
  },

  // Danh sách email được phép đăng nhập vào DuoSpace (chỉ 2 bạn)
  // Hãy điền đúng địa chỉ Gmail của Đức và Sương vào đây
  allowedUsers: [
    {
      email: "leducst1@gmail.com", // Điền Gmail của Đức
      code: "Đ",
      name: "Phước Đức"
    },
    {
      email: "suongtranst1@gmail.com",   // Điền Gmail của Sương
      code: "S",
      name: "Thu Sương"
    }
  ],

  // Bật chế độ Demo khi chưa điền API Key thật
  // Khi apiKey vẫn là placeholder, app sẽ tự động hiển thị hướng dẫn hoặc cho phép demo test
  isConfigured() {
    return this.firebaseConfig.apiKey && !this.firebaseConfig.apiKey.includes('YOUR_API_KEY');
  }
};
