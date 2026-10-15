# Führerschein Viet-Duc — source 1.0.11 (22)

Đọc `docs/IMPLEMENTATION.md` để xem thay đổi, version source so với App Store, kết quả audit Unlisted và giới hạn build. Checklist test ở `docs/TESTFLIGHT_CHECKLIST.md`; log 24 kiểm thử ở `docs/TEST_RESULTS.txt`; danh sách file thay đổi ở `docs/CHANGED_FILES.txt`.

Đây là SOURCE đầy đủ và tài nguyên www đã build, **chưa phải IPA/TestFlight đã ký số**. Source iOS đầu vào nguyên vẹn nằm trong `rollback/` của gói bàn giao; không sửa backend/DB. Không submit public version mới trước khi chủ app test và đồng ý.

Quyền repo GitHub đã được cấp. Pipeline đã chuẩn bị để kiểm tra native và upload TestFlight khi có đủ ba secret `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`. Repo hiện chưa có secret ký số. Không gửi password/p8/secret trong chat; nhập trực tiếp vào GitHub Actions Secrets.
