# Führerschein Viet-Duc — app cũ đã có TestFlight mới

**1.0.12 (23)** đã upload thành công cho **app cũ** App ID **6793430149**, bundle **com.ronnguyen.fuehrerscheinvietduc**. Apple processing **VALID**; đã thêm vào nhóm **VietDuc Internal**, 1 tester hiện có; checklist What to Test đã lưu qua App Store Connect.

Source: nhánh `codex/ios-ai-speed-room-ai-explanations-20261019`, build commit `c8d09cb47ad292b6e5fa83b4c7851058ec18b599`. GitHub Actions **39221450343**, attempt 2: 50 kiểm thử, native simulator/archive/export, kiểm tra IPA signature và upload đều thành công. Apple xác nhận VALID lúc 08:31:30 UTC ngày 19/10/2026.

App Store vẫn phát hành 1.0.11 (22). Chờ chủ app test giải thích AI trên 1.0.12 (23) trước khi gửi cập nhật này lên App Store. Không upload lại cùng build 23.

Chủ app đã xác nhận thu hồi riêng tài nguyên ký Public build3 chưa submit để nhường chỗ ký app cũ. Đã thực hiện qua workflow39222818187; không thu hồi chứng chỉ Public build2 đang chờ duyệt. Bước gắn nhóm API bị403, đã hoàn tất qua UI sau đăng nhập. Không chạy lại thao tác giải phóng slot đã xong.

Đọc `docs/LEGACY_AI_EXPLANATION_UPDATE_2026-10-19.md` để xem file thay đổi, tác động, checklist và rollback. Không đổi bundle/device lock/backend. Cập nhật qua TestFlight của app cũ đang dùng; không cần chuyển sang app Public.
