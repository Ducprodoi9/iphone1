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
Nhóm Owner Public TestFlight có 1 tester `tài khoản chủ app`, trạng thái Invited (kiểm tra 19/10). Lời mời chưa được chấp nhận. Không thay Availability/App Review của Public; chỉ thu hồi tài nguyên ký Public build3 chưa submit sau khi chủ app xác nhận để nhường chỗ ký app cũ.

## Lịch sử hai lượt build đầu — đã được xử lý ở lượt chạy lại bên dưới
- Run 39220982738: native build/archive thành công; API lọc identifier trả về cả bundle cũ và `.public`, nên chưa tạo certificate/upload. Đã thêm `ci/registered-bundle.mjs` và 3 regression tests, chọn exact identifier; pipeline đã xác nhận chọn ID **[resource đúng app cũ]** cho app cũ, không chọn **[resource app Public]** của Public.
- Run 39221450343, commit `c8d09cb47ad292b6e5fa83b4c7851058ec18b599`: 35 frontend + 15 CI đạt, native BUILD SUCCEEDED và ARCHIVE SUCCEEDED. Apple xác thực HTTP200 đúng app cũ. Bị chặn tại POST /v1/certificates HTTP409: You already have a current Distribution certificate or a pending certificate request. Không tạo certificate mới, không upload/build 23 trên Apple.
- Kiểm tra chỉ đọc run 39221827974 xác nhận tài khoản có hai Distribution certificates: **[chứng chỉ Public build 2]** (profile **[profile Public build 2]**, Public build 2 đang chờ review) và **[chứng chỉ Public build 3]** (profile **[profile Public build 3]**, Public build 3 mới đưa lên TestFlight, chưa đưa vào hồ sơ App Review). Cả hai profile đang ACTIVE và thuộc bundle `.public`. Không có chứng chỉ dư khác để dọn.
- Chưa thu hồi chứng chỉ nào. Không được thu hồi [chứng chỉ Public build 2] khi build 2 đang chờ duyệt.
- Phương án ưu tiên app cũ: cần chủ app xác nhận thu hồi certificate [chứng chỉ Public build 3]/profile[profile Public build 3] của Public build 3 để dành slot ký cho app cũ. Đây là thao tác không hoàn tác được; Public build 3 cần ký/build mới trước khi dùng để phát hành sau này. Source Public đã backup trên nhánh riêng. Sau xác nhận: kiểm tra lại build3 chưa gắn review, chỉ xóa đúng hai ID này, rerun job thất bại của run39221450343 (build23 chưa upload), rồi gắn vào nhóm **VietDuc Internal**, ID **[nhóm test hiện có của app cũ]**.
- Nhóm app cũ có tester tài khoản chủ app, Installed 1.0.11 (22). Nhóm app mới vẫn Invited. Phiên web Apple cần đăng nhập lại; việc ký/upload/gắn nhóm có thể chạy qua API hiện có trong GitHub, không cần cung cấp lại p8/API secrets.

## Kết quả hoàn tất — 19/10/2026
- Chủ app xác nhận thu hồi riêng tài nguyên ký của Public build3 chưa submit. Workflow **39222818187**, job release-approved-slot: SUCCESS; kiểm tra build3 không gắn vào App Store version, profile chỉ dùng cho đúng lượt CI Public3 và certificate không được profile khác dùng. Chỉ thu hồi tài nguyên ký Public3 đã được cho phép; giữ tài nguyên Public2 đang review.
- Chạy lại run **39221450343**, attempt2, build commit **c8d09cb47ad292b6e5fa83b4c7851058ec18b599**. **SUCCESS**: 35 frontend + 15 CI đạt; BUILD SUCCEEDED, ARCHIVE SUCCEEDED, EXPORT SUCCEEDED, IPA_SIGNATURE_VERIFIED.
- Apple **TESTFLIGHT_BUILD_VALID 1.0.12 (23)** lúc **2026-10-19 08:31:30 UTC**. Giữ certificate/profile mới cho App Review; private key/keychain tạm trên runner đã dọn.
- API gắn nhóm tự động báo403; sau đăng nhập lại đã thêm build23 vào nhóm **VietDuc Internal** qua UI. Trang build xác nhận Group(1), Internal, 1 tester; danh sách iOS Builds hiển thị Version1.0.12 / Build23 / VietDuc Internal. What to Test đã Saved.
- App cũ đã sẵn sàng cho chủ app cập nhật trong TestFlight. App Store hiện vẫn 1.0.11; chưa submit1.0.12 trước khi chủ app test phần giải thích AI. Public2 vẫn Waiting for Review theo phiên Apple vừa xác nhận; không thay submission đó.
- Không rerun build23 hoặc workflow thu hồi slot đã hoàn tất. Nếu cần sửa source tiếp, tăng build number; giữ nguyên target app cũ theo yêu cầu ưu tiên của chủ app.
