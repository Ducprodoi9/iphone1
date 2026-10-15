# Führerschein Viet-Duc — iOS/App Store v1.0.3 (Build 18)

## Trạng thái bản này

Bản này được cập nhật từ source iOS hiện tại để đưa lên App Store sau khi web đã được khách test ổn.

- Version: **1.0.3**
- Build: **18**
- Bundle ID: `com.ronnguyen.fuehrerscheinvietduc`
- Hỗ trợ: **iPhone + iPad**
- iPhone: Portrait
- iPad: Portrait + Landscape Left/Right
- Giao diện app **tự nhận diện kích thước/orientation**, không có bước chọn Điện thoại/iPad/Máy tính như web.

## Các lỗi/chức năng đã cập nhật

1. Phần học phản hồi đúng/sai ngay lập tức, không bắt người học chờ request mạng xong mới thấy kết quả.
2. Khi thoát phần học rồi vào lại, thứ tự đáp án được xáo lại; Thi thử giữ luồng riêng, không áp dụng xáo đáp án của phần học.
3. Ảnh câu hỏi dùng `object-fit: contain`, không crop mất góc; iPad ngang hiển thị câu hỏi phía trên, media bên trái và đáp án bên phải.
4. Sau khi kiểm tra câu, `keyword_de` / `keyword_vi` (nếu admin đã nhập) hiển thị màu xanh dương làm từ khóa/mẹo nhớ.
5. Tìm câu hỏi hoạt động thật theo mã câu, nội dung Đức/Việt, đáp án và từ khóa.
6. Ảnh có thể bấm để xem toàn màn hình; video có nút fullscreen và hỗ trợ fullscreen native trên iOS.
7. Ô chọn đáp án dùng checkbox custom viền đen đậm, không còn viền xám nhạt của Safari/WKWebView.
8. API tự retry khi mạng/DNS chập chờn; lỗi mạng tạm thời không tự xóa token/đá người dùng về login.
9. Bỏ hard-code numeric cho `1.2.34-010`; app ưu tiên `answer_type` từ backend.
10. Thứ tự câu trong phần học tiếp tục lấy đúng thứ tự API/backend (`study_order` trước, sau đó `id`).

11. **Fix race condition phần Học:** response chấm câu cũ không thể áp sang câu mới; chặn double-tap Weiter 450ms để không còn tự chuyển câu/tự chấm sai khi chưa bấm.

## Mở và Archive trên Mac

1. Giải nén ZIP.
2. Mở:
   `ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc.xcworkspace`
3. Trong Xcode chọn target `FuehrerscheinVietDuc` → Signing & Capabilities → chọn Team Apple Developer đang phát hành app.
4. Kiểm tra Version = `1.0.3`, Build = `18`.
5. Chọn `Any iOS Device (arm64)`.
6. Product → Archive.
7. Organizer → Distribute App → App Store Connect → Upload.

Thư mục `ios/.../www/` đã được build/copy sẵn, nên có thể mở Xcode và Archive trực tiếp mà không cần chạy npm trước.

## Nếu cần build lại giao diện từ source

Source nằm tại `mobile-app-source/`.

Trên Mac Apple Silicon:

```bash
cd mobile-app-source
npm install
npm run build
```

Sau đó copy toàn bộ nội dung `dist/` vào:

`ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc/www/`

Bản ZIP bàn giao hiện tại đã có `www/` mới nên bước này chỉ cần khi tiếp tục sửa source.

## API production

`https://nguyenron.com/fuehrerschein-backend/api`

Câu hỏi/đáp án/video/từ khóa thay đổi trên backend sẽ được app lấy qua API. Những thay đổi chỉ về dữ liệu thường không cần phát hành lại app.

## Lưu ý App Store Connect khi bật iPad

Bản này chuyển target từ iPhone-only sang **Universal iPhone + iPad**. Khi submit update, App Store Connect có thể yêu cầu thêm screenshot iPad. Nên test bản Archive/TestFlight trên ít nhất một iPad thật ở cả Portrait và Landscape trước khi gửi Review.
