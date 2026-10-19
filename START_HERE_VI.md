# Führerschein Viet-Duc by Ron — Public target

App ID **6823455331**, bundle **com.ronnguyen.fuehrerscheinvietduc.public**, TestFlight mới nhất **1.0.0 (3)**; hồ sơ App Review vẫn dùng **1.0.0 (2)**. Build 3 bổ sung nút Giải thích AI tại câu hỏi theo web production; backend và app Unlisted cũ không đổi.

Đã sửa lỗi **ITMS-90035 Invalid Signature**: giữ chứng chỉ/profile ký sau khi upload để Apple xét duyệt, vẫn xóa private key/keychain tạm trên runner. CI run **39033000383** thành công, 34 kiểm tra đạt; IPA được kiểm tra chữ ký và Apple processing **VALID**. Build 2 đã vào nhóm TestFlight của chủ tài khoản.

Đã gửi lại Apple lúc **19:39 ngày 17/10/2026 (giờ Việt Nam)**. Trạng thái **Waiting for Review**, submission **f22e63ab-7c14-4c17-99f0-c89d0a4cc6ff**. Phân phối **Public, miễn phí, Đức + Việt Nam**, tự phát hành sau khi Apple duyệt. **Chưa phát hành công khai.**

Ngày 19/10/2026: CI **39218620713** thành công, 45 kiểm thử đạt; build **1.0.0 (3)** được Apple xử lý **VALID** và đã thêm vào **Owner Public TestFlight** (1 tester hiện có). Checklist What to Test đã lưu. Không thay build 2 đang chờ Apple duyệt trước khi chủ app test phần giải thích AI. Xem `docs/AI_EXPLANATION_FIX_2026-10-19.md` cho file thay đổi, kiểm chứng và rollback.

Đọc `docs/SIGNATURE_FIX_2026-10-17.md` và `docs/PUBLIC_DISTRIBUTION.md` trước khi tiếp tục. Không chạy lại cơ chế thu hồi chứng chỉ ngay sau upload; không dùng App ID Unlisted 6793430149 cho nhánh này.

Học viên chuyển app sang Public cần admin reset thiết bị một lần trước đăng nhập; không sửa database hoặc bỏ khóa thiết bị.
