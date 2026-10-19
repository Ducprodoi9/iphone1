# Führerschein Viet-Duc — ưu tiên app cũ

Đang cập nhật **app cũ** App ID **6793430149**, bundle **com.ronnguyen.fuehrerscheinvietduc**, phiên bản **1.0.12 (23)**, nhánh `codex/ios-ai-speed-room-ai-explanations-20261019`.

App đang phát hành: 1.0.11 (22). Bản mới bổ sung giải thích AI trực tiếp tại câu hỏi theo web, đồng thời dùng quy trình ký đã sửa để giữ certificate/profile sau upload. Có 47 kiểm thử và frontend build/sync đạt.

Đọc `docs/LEGACY_AI_EXPLANATION_UPDATE_2026-10-19.md` để xem file thay đổi, tác động, checklist và rollback. Giữ bundle/app cũ; không nhầm target Public `6823455331` / bundle `.public`. Backend và device lock không đổi.

**CHƯA CÓ BUILD23 TRÊN TESTFLIGHT.** Run39221450343 đã qua 50 kiểm thử và archive, nhưng Apple HTTP409 vì đầy Distribution certificate. Kiểm tra chỉ đọc xác nhận hai slot đang dành cho Public build2 và3. Cần xác nhận của chủ app trước khi thu hồi đúng cert[chứng chỉ Public build 3]/profile[profile Public build 3] (Public3 chưa submit); giữ cert[chứng chỉ Public build 2]/profile[profile Public build 2] (Public2 đang review). Xem báo cáo để tiếp tục; không tự rerun khi slot chưa được giải phóng.
