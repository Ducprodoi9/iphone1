# Führerschein Viet-Duc — AI + Phòng luyện tốc độ

## Source và version

Source iOS được gửi là UIKit/WKWebView + React, iOS 15+, project `ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc.xcodeproj`, scheme `FuehrerscheinVietDuc`. Không cần tạo lại app bằng Capacitor/CocoaPods. Giữ bundle `com.ronnguyen.fuehrerscheinvietduc`. Source đầu vào dùng Team cũ `3JD7L6FN23`; theo Membership do chủ app cung cấp, cấu hình ký số hiện tại đã đổi sang Team `285CT4P989` (Đức Hà). Không đổi bundle hoặc dữ liệu học. ExportOptions bỏ pin certificate của Team cũ.

Source gốc đặt version **1.0.3 (21)**, trong khi App Store Connect thực tế có **1.0.10 (21)**, Ready for Distribution. Không thể chứng minh source trùng binary đang phát hành chỉ bằng số build. Bản bàn giao đặt **1.0.11 (22)**; kiểm tra lại build cao nhất trước upload nếu có bên khác upload sau lần kiểm tra này. TestFlight build 21 cũ đã Expired.

## Thay đổi và ảnh hưởng

- `mobile-app-source/public/features/runtime.js`: API production hiện có; bearer token, timeout hữu hạn, hủy request, chặn kết quả sau đổi tài khoản, gộp request cấu hình, không tự retry POST.
- `ai-assistant.js`, `ai-assistant.css`: port module WEB production; gói/quota/hạn AI/lịch sử/quick prompts/greeting nhanh; ưu tiên questions, answers, cờ đáp án đúng và giải thích hệ thống khi có mã câu. Kiểm tra 5 điểm bằng points thật. Markdown escape HTML; trạng thái phân tích, lỗi/thử lại, chống gửi trùng và xác nhận xóa lịch sử. Chat đã được backend nhận không bị gửi lại do bước kiểm tra bổ sung chậm.
- `speed-room.js`, `speed-room.css`: port module WEB production, dùng room/question/answers/countdown/điểm/trạng thái từ backend; bảng xếp hạng ngày/tuần/tháng/tất cả, thưởng, chat, review theo nghiệp vụ web. Không tự chấm. Hủy polling khi đóng/nền, có thử lại khi lỗi, chống gửi trùng kể cả chuyển nền; phản hồi round cũ không xóa đáp án đang chọn của round mới.
- `native.css`: app shell hiện tại, safe area, scroll/keyboard, chat composer/touch target; giữ màu và light mode của app gốc.
- `mobile-app-source/index.html`: nạp module/CSS mới, không sửa component React cũ.
- `scripts/sync-ios.mjs`, `package.json`, `package-lock.json`: build/sync www, kiểm thử và version frontend.
- `ios/.../ViewController.swift`: keyboardLayoutGuide, kéo đóng keyboard và native JavaScript alert/confirm cho nội dung local tin cậy, cần cho xóa chat.
- `project.pbxproj`: 1.0.11 (22). `ios/.../www/`: tài nguyên production được build lại.
- `.github/workflows/ios-verify.yml`: kiểm thử JS, compile simulator trên macOS; chỉ archive/upload TestFlight khi có đủ ba secret ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY. `ci/upload-testflight.sh` dùng cloud signing tự động, không pin certificate cũ.
- `tests/*.test.cjs`: kiểm thử transport, Markdown/quota/dữ liệu/điểm/gửi trùng/vòng đời. Danh sách đường dẫn đầy đủ ở `CHANGED_FILES.txt`.

`src/main.tsx`, `src/api.ts`, `src/styles.css`, native `Info.plist` giữ nguyên byte. Đăng nhập/device lock/demo/Learn/Exam/Wrong/Marked/thống kê/profile giữ code cũ. Vì www được build lại, vẫn cần test hồi quy trên thiết bị. Không sửa web/backend/database production; không có SQL/migration cần chạy.

## Xác minh và build

**24 ca kiểm thử Node/JSDOM đạt**, Vite production build + sync www đạt, kiểm tra syntax JS/diff/XML đạt. JSDOM không xác nhận layout iPhone. GitHub Actions đã compile native simulator arm64/x86_64 thành công với Xcode 26.6, log `BUILD SUCCEEDED`, ngày 15/10/2026. Lượt chạy: https://github.com/Ducprodoi9/iphone1/actions/runs/38772708952 (commit 897aba6025b891216326129956815891e18dc52e). Chưa archive ký số/upload TestFlight vì thiếu ba secret API key; bước upload được skipped. Không submit bản public mới.

Trên macOS có Xcode và Node 22:

```sh
cd mobile-app-source
npm ci
npm test
npm run build:ios
```

Mở Xcode project hiện có, chọn scheme `FuehrerscheinVietDuc`, kiểm tra signing hiện hữu, build simulator/iPhone, archive rồi upload TestFlight. Không chạy `cap add ios` để thay project hiện có.

Quyền GitHub cho `Ducprodoi9/iphone1` đã được cấp ngày 15/10/2026; nhánh `codex/ios-ai-speed-room-20261015` đã tạo thành công, dựa trên main hiện hữu. Repo gốc chỉ có assets/ExportOptions, không có workflow build cũ. Đã kiểm tra trực tiếp trang Actions Secrets: repo và environment chưa có secret. Pipeline mới kiểm tra JS/native trước, rồi chỉ archive/upload khi đủ `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` (nội dung p8). Ưu tiên dùng lại key còn hiệu lực; chưa yêu cầu tạo certificate/p12 mới. Chưa có build mới trên TestFlight.

## Rollback

Trong gói ZIP bàn giao, `rollback/` chứa nguyên ZIP iOS đầu vào; SHA256 ở `SHA256SUMS.txt`. Repo GitHub không chứa bản ZIP rollback. Khôi phục source từ ZIP đó nếu cần. Rollback source không hạ được version App Store đã phát hành. Giữ baseline và các commit triển khai trong git cục bộ. Source đã push lên nhánh riêng của repo iphone1, giữ nguyên main và lịch sử có sẵn.

## App 1.0.10: public/discoverability

App ID 6793430149. **Distribution: Unlisted**, chỉ tìm/cài qua liên kết, không xuất hiện App Store Search. Không có nút chuyển Public tại trang distribution. Đây là nguyên nhân chính, không phải chỉ nhà phát hành nhìn thấy app.

Pricing Free. 173 territories Available, Belarus/Russia Processing; Germany và Vietnam Available. Release Automatic; không thấy chặn ngày phát hành. Free Apps Agreement Active, DSA trader Active. Privacy Published, age rating 4+ với ngoại lệ vùng, category Education, Content Rights khai có quyền dùng nội dung bên thứ ba. Bản phát hành không hiển thị compliance/review blocker; không sửa tờ khai pháp lý/export compliance. Subtitle đang trống, metadata không thay đổi. Không đưa tài khoản review vào tài liệu.

Đã mở trực tiếp trang public DE/VN/US và thấy app Free 1.0.10:

- https://apps.apple.com/de/app/f%C3%BChrerschein-viet-duc/id6793430149
- https://apps.apple.com/vn/app/f%C3%BChrerschein-viet-duc/id6793430149
- https://apps.apple.com/us/app/f%C3%BChrerschein-viet-duc/id6793430149

Theo Apple, distribution đã duyệt không đổi ngược Unlisted sang Public; các update sau vẫn Unlisted. Chỉnh territories hoặc upload AI không giải quyết Search. Có thể xác minh ngoại lệ với Apple Support; nếu không có ngoại lệ, cần app record/bundle Public riêng và đánh giá chuyển người dùng/device lock. Chưa liên hệ Apple, tạo app mới, đổi bundle hoặc submit thay người dùng.

Nguồn: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/set-distribution-methods/
