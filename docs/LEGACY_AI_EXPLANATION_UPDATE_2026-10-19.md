# Führerschein Viet-Duc cũ — cập nhật giải thích AI ngày 19/10/2026

## Mục tiêu và định danh
Chủ app yêu cầu ưu tiên cập nhật app cũ đang sử dụng vì chưa nhận lời mời TestFlight app Public. Đã kiểm tra ASC: app cũ 1.0.11 Ready for Distribution; build 22 hiện có. Bản cập nhật: **1.0.12 (23)**, App ID **6793430149**, bundle **com.ronnguyen.fuehrerscheinvietduc**, Team **285CT4P989**. Nhánh `codex/ios-ai-speed-room-ai-explanations-20261019` bắt đầu từ source app cũ `8a70c132cc63f95ffd1dd8b0792af10e919491c5`.

## File thay đổi và ảnh hưởng
- `mobile-app-source/src/main.tsx`: slot giải thích AI cạnh bóng đèn, chỉ ngoài lúc đang thi. Giải thích thường giữ nguyên.
- `mobile-app-source/public/features/ai-explanations.js` / `.css`: cùng module đã kiểm chứng trong Public build 3, port từ web production. Quyền dùng `ai_explanation.php?mode=state`; nội dung `mode=question` khớp ID/mã và `detailed_explanation_vi`. Timeout 12 giây, chống bấm trùng, hủy khi đóng/chuyển câu/đổi tài khoản, lỗi và thử lại; render Markdown an toàn.
- `mobile-app-source/index.html`: nạp hai asset trên; `ios/.../www`: build và sync lại.
- `mobile-app-source/tests/explanations.test.cjs`: 11 kiểm thử quyền, nội dung, mạng/deadline, vòng đời và thao tác trên app React thật.
- `ci/app-target.json` / `.mjs` / `.test.mjs`: cấu hình tập trung đúng app cũ, chặn App ID/bundle Public hoặc Team khác; kiểm tra version/build đồng bộ native và frontend.
- `ci/rest-testflight.mjs`, `ci/cleanup-signing.mjs`, `ci/verify-asc-access.mjs`: chuyển cơ chế xác minh IPA và giữ certificate/profile sau upload đã hoạt động ở Public sang đúng target cũ. Private key/keychain tạm vẫn xóa. Không thu hồi tài nguyên ký của lượt khác hoặc app Public. Chỉ dọn ID của lượt CI này khi chưa upload hoặc Apple xác nhận FAILED/INVALID; upload VALID hoặc chưa rõ trạng thái vẫn được giữ để xét duyệt.
- `ci/signing-retention.test.mjs`: kiểm tra cleanup command thật, mock duy nhất Apple API.
- `.github/workflows/ios-verify.yml`: vẫn trigger nhánh app cũ, chạy đủ 12 kiểm thử CI.
- `project.pbxproj`, `mobile-app-source/package.json`, `package-lock.json`: version 1.0.12 / build 23.

Không đổi `Info.plist`, `ViewController.swift`, `src/api.ts`, `src/styles.css`; bundle/login/device lock/demo/học/thi/chấm/đánh dấu/thống kê/profile giữ source cũ ngoài slot AI trên. Không đổi backend, database hoặc SQL. Cập nhật cùng app cũ giữ local storage theo bundle; không áp dụng quy trình chuyển thiết bị của app Public.

## Kiểm chứng và rollback
Baseline đạt 24 frontend + 4 CI. Trước sửa, kiểm thử màn học thật thất bại do thiếu nút AI; hai kiểm thử retention thất bại vì pipeline cũ thu hồi tài nguyên sau upload. Sau sửa, 35 frontend + 12 CI đạt; Vite build và sync www đạt. Chưa xác nhận layout WKWebView trên thiết bị thật bằng JSDOM.

Rollback về baseline `8a70c132cc63f95ffd1dd8b0792af10e919491c5` hoặc revert các commit mới rồi dùng build number tăng tiếp. Không hạ số build đã upload. Không sửa lịch sử main/nhánh Public.

## Checklist TestFlight
Dùng app **Führerschein Viet-Duc** (không có by Ron), 1.0.12 (23). Học/chủ đề, Câu sai/Đánh dấu, xem lại sau thi: bấm AI cạnh bóng đèn với tài khoản AI còn hạn. Kiểm tra mã câu/lời giải tiếng Việt, giải thích thường, trường hợp hết quyền/chưa có dữ liệu, mất mạng/thử lại, bấm liên tiếp và chuyển câu khi tải. Đang thi không có giải thích AI. Test nhanh các luồng cũ và Speed Room.

## App Public
Nhóm Owner Public TestFlight có 1 tester `ducprodoi9@gmail.com`, trạng thái Invited (kiểm tra 19/10). Lời mời chưa được chấp nhận. Bản Public/Availability/App Review không được thay đổi trong lượt chuyển cập nhật sang app cũ này.
