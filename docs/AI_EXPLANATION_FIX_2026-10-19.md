# Bổ sung giải thích AI trong màn câu hỏi iOS — 19/10/2026

## Lỗi và nguyên nhân
Source Public baseline `10b0ebf` đã có Trợ lý AI nhưng thiếu module giải thích AI trong câu hỏi. `ExplanationModal` chỉ đọc `explanation_de`/`explanation_vi`; chưa có slot hoặc asset `ai-explanations-v1` như web production đã gửi. Vì vậy gói AI còn hạn cũng không có nút mở `detailed_explanation_vi` tại màn học.

## Thay đổi
- `mobile-app-source/src/main.tsx`: thêm slot ID/mã câu cạnh nút 💡, dùng chung cho Practice (gồm Wrong/Marked) và xem lại câu sai sau thi. Đang thi có countdown không tạo slot, không gọi API giải thích.
- `mobile-app-source/public/features/ai-explanations.js`: port đúng module web, gọi GET `ai_explanation.php?mode=state` và `mode=question`, giữ quyền do backend quyết định. Kiểm tra phản hồi khớp ID/mã; chỉ đọc dữ liệu có sẵn, không gọi model để tự tạo lời giải. Dùng transport iOS hiện có với deadline 12 giây, hủy khi đóng/chuyển câu/đổi tài khoản, chống bấm trùng và nút thử lại. Render Markdown bằng bộ render an toàn đã dùng trong Trợ lý AI.
- `mobile-app-source/public/features/ai-explanations.css`: giữ dialog/màu/bố cục web, thêm safe area, vùng cuộn và kích thước nút đóng cho iPhone.
- `mobile-app-source/index.html`: nạp hai asset mới.
- `mobile-app-source/tests/explanations.test.cjs`: 11 ca quyền/trạng thái/lỗi, gồm render và thao tác trên app React thật.
- `ios/.../www`: bundle tạo lại từ source bằng script hiện có.

Giải thích thường vẫn được giữ. Không sửa login/device lock/demo, đáp án, chấm Practice/Exam/Speed Room, thống kê, backend, production database hoặc SQL. Không có migration phải chạy.

## Kiểm chứng
- Trước sửa: kiểm thử màn học thật thất bại do không có nút AI; màn đang thi không gọi AI đã đạt.
- Sau sửa: toàn bộ 35 kiểm thử frontend đạt (24 cũ + 11 mới), Vite build/sync www đạt.
- 10 kiểm thử CI/Apple REST/signing retention đạt khi chạy từ gốc repo. Lần đầu gọi các kiểm thử signing từ thư mục frontend bị sai thư mục import; chạy lại đúng như workflow đã đạt, không cần sửa pipeline.
- Review độc lập không phát hiện lỗi critical/important. JSDOM không xác nhận layout hoặc VoiceOver trên WKWebView; cần test iPhone qua TestFlight.

## Checklist thiết bị
1. Tài khoản AI còn hạn: Học → 30 câu hoặc Chủ đề → nút AI cạnh 💡; lời giải phải khớp mã câu.
2. Vào Câu sai/Đánh dấu → Ôn lại; nút AI hoạt động như Học.
3. Kiểm tra một câu chưa có lời giải: hiển thị thông báo chưa có dữ liệu, giải thích thường vẫn mở được.
4. Tài khoản không có AI/hết hạn: không có nút AI; học và giải thích thường vẫn hoạt động.
5. Mất mạng khi mở → có lỗi và Thử lại; bật mạng, thử lại thành công. Bấm liên tiếp không tạo nhiều hộp/request.
6. Đóng, chuyển câu hoặc đăng xuất trong lúc tải: không hiện lời giải cũ lên câu/tài khoản mới.
7. Đang thi 30 câu: không có nút AI hoặc request giải thích. Nộp bài → xem lại câu sai có AI theo quyền.
8. iPhone nhỏ/lớn, dọc/ngang: cuộn hết lời giải và luôn bấm được Đóng/Quay lại. Markdown không hiện escape thô.
9. Kiểm tra nhanh Trợ lý AI, Speed Room, login, đánh dấu và chấm bài như bản trước.

## Rollback
Baseline `10b0ebf0dec3ac4b893447f310b902e997e6936d` giữ nguyên trên GitHub; revert commit chức năng rồi build lại với build number mới nếu cần. Không hạ số build đã upload. Bản App Store đang có và dữ liệu backend không bị thay bằng việc upload bản thử nghiệm.

## Phân phối
Ngày 19/10 đã kiểm tra trực tiếp Apple: 1.0.0 (2) vẫn Waiting for Review. Bản sửa tăng lên 1.0.0 (3), chưa thay bản đang duyệt.

Bản sửa đã được cấp cho nhóm Owner Public TestFlight hiện có (1 tester); checklist What to Test đã lưu trên Apple. Không tự thay build trong hồ sơ App Review hoặc phát hành bản sửa trước khi chủ app test.

## Kết quả build đã xác nhận
- Nhánh: `codex/ios-public-ai-explanations-20261019`.
- Source commit: `a3a8aa53405da8d354d7cd79b9aed117523a794e`; build commit: `456da3ffc12e3918852b65f3e5d55940f98ab779`.
- CI: https://github.com/Ducprodoi9/iphone1/actions/runs/39218620713 — SUCCESS.
- CI đạt 45/45 kiểm thử, native simulator BUILD SUCCEEDED, ARCHIVE SUCCEEDED, EXPORT SUCCEEDED và IPA_SIGNATURE_VERIFIED.
- Apple: TESTFLIGHT_BUILD_VALID **1.0.0 (3)** lúc **2026-10-19 07:54:34 UTC**; build ID **72b15b9f-a3de-415e-a506-4522739a3cd0**.
- Giữ certificate `7F7QT8C86C` và profile `23R29WCXCH` theo cơ chế ký đã sửa, không thu hồi tài nguyên ký của build đang chờ review. Khóa private/keychain tạm trên runner đã được dọn.
