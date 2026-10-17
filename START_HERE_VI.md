# Führerschein Viet-Duc by Ron — Public target

App ID **6823455331**, bundle **com.ronnguyen.fuehrerscheinvietduc.public**, version **1.0.0 (2)**. Dùng nguyên chức năng AI + Speed Room đã test; backend và app Unlisted cũ không đổi.

Đã sửa lỗi **ITMS-90035 Invalid Signature**: giữ chứng chỉ/profile ký sau khi upload để Apple xét duyệt, vẫn xóa private key/keychain tạm trên runner. CI run **39033000383** thành công, 34 kiểm tra đạt; IPA được kiểm tra chữ ký và Apple processing **VALID**. Build 2 đã vào nhóm TestFlight của chủ tài khoản.

Đã gửi lại Apple lúc **19:39 ngày 17/10/2026 (giờ Việt Nam)**. Trạng thái **Waiting for Review**, submission **f22e63ab-7c14-4c17-99f0-c89d0a4cc6ff**. Phân phối **Public, miễn phí, Đức + Việt Nam**, tự phát hành sau khi Apple duyệt. **Chưa phát hành công khai.**

Đọc `docs/SIGNATURE_FIX_2026-10-17.md` và `docs/PUBLIC_DISTRIBUTION.md` trước khi tiếp tục. Không chạy lại cơ chế thu hồi chứng chỉ ngay sau upload; không dùng App ID Unlisted 6793430149 cho nhánh này.

Học viên chuyển app sang Public cần admin reset thiết bị một lần trước đăng nhập; không sửa database hoặc bỏ khóa thiết bị.
