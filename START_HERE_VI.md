# Führerschein Viet-Duc — app cũ đã gửi App Review

**1.0.12 (23)** đã upload thành công cho **app cũ** App ID **6793430149**, bundle **com.ronnguyen.fuehrerscheinvietduc**. Apple processing **VALID**; đã thêm vào nhóm **VietDuc Internal**, 1 tester hiện có; checklist What to Test đã lưu qua App Store Connect.

Source: nhánh `codex/ios-ai-speed-room-ai-explanations-20261019`, build commit `c8d09cb47ad292b6e5fa83b4c7851058ec18b599`. GitHub Actions **39221450343**, attempt 2: 50 kiểm thử, native simulator/archive/export, kiểm tra IPA signature và upload đều thành công. Apple xác nhận VALID lúc 08:31:30 UTC ngày 19/10/2026.

Chủ app xác nhận test OK và yêu cầu phát hành. Đã gửi **1.0.12 (23)** cho Apple lúc **16:13 GMT+7 ngày 19/10/2026**. Trang iOS Submission xác nhận **Waiting for Review**, Items Submitted (1), đúng build 23. Đã chọn tự động phát hành sau khi Apple duyệt, phát hành cập nhật cho tất cả người dùng ngay khi được duyệt. App Store hiện vẫn 1.0.11 (22) trong thời gian chờ. Không upload lại cùng build 23.

Giữ nguyên metadata, ảnh có sẵn, tài khoản review và chế độ Unlisted của app cũ. Chỉ cập nhật release notes và hướng dẫn review cho phần giải thích AI. Bản này chưa được Apple phê duyệt; cập nhật không tự chuyển app cũ thành Public Search.

Chủ app đã xác nhận thu hồi riêng tài nguyên ký Public build3 chưa submit để nhường chỗ ký app cũ. Đã thực hiện qua workflow39222818187; không thu hồi chứng chỉ Public build2 đang chờ duyệt. Bước gắn nhóm API bị403, đã hoàn tất qua UI sau đăng nhập. Không chạy lại thao tác giải phóng slot đã xong.

Đọc `docs/LEGACY_AI_EXPLANATION_UPDATE_2026-10-19.md` để xem file thay đổi, tác động, checklist và rollback. Không đổi bundle/device lock/backend. Cập nhật qua TestFlight của app cũ đang dùng; không cần chuyển sang app Public.
