# Checklist TestFlight trước phát hành

Bản ZIP chưa upload TestFlight. Chỉ release sau khi chủ app test và đồng ý.

## Build/thiết bị

- [ ] Compile simulator + archive ký số thành công; kiểm tra build cao nhất trên ASC trước upload 1.0.11 (22).
- [ ] Cài mới và update từ 1.0.10, giữ session/dữ liệu; iPhone SE và iPhone lớn; iPad nếu tiếp tục hỗ trợ.
- [ ] Không viền đen/overflow; safe area/keyboard/scroll đúng; mở đóng màn nhiều lần.

## Luồng cũ

- [ ] Login/logout/token hết hạn; khóa tài khoản thường ở thiết bị thứ hai và ngoại lệ demo Apple như bản cũ.
- [ ] Learn theo chủ đề, ảnh/video, đáp án/giải thích và lưu tiến độ.
- [ ] Thi 30 câu, chấm/nộp/review; marked review; câu sai/đánh dấu/thống kê/profile; đối chiếu WEB cùng tài khoản.

## AI

- [ ] Không có AI/gói thường/nâng cao: quyền, hạn và quota đúng backend/WEB.
- [ ] Greeting nhanh, quick prompts, lịch sử; xóa có confirm và cancel.
- [ ] Câu có mã dùng nội dung/đáp án/giải thích hệ thống; thử mã -M, ảnh/video có points khác 5.
- [ ] Chủ đề yếu/câu sai/5 điểm/đề gần đây/Speed dùng learning profile; chưa có dữ liệu báo không đủ dữ liệu.
- [ ] Markdown dễ đọc, không escape thô; HTML không thực thi.
- [ ] Bấm liên tục chỉ một POST; loading hữu hạn; offline/timeout có lỗi và thử lại.
- [ ] Bàn phím không che chat; đóng màn/đổi tài khoản lúc tải không lộ kết quả cũ.
- [ ] Backend đã nhận chat nhưng bước kiểm tra chậm: quota vẫn cập nhật, không tự gửi lại chat.

## Speed Room

- [ ] Câu/ảnh/video/đáp án/countdown/điểm/trạng thái khớp WEB; backend chấm.
- [ ] Đúng/sai/hết giờ/người khác chốt trước/chờ/round tiếp theo.
- [ ] Bấm liên tục và chuyển nền khi đang chốt không gửi hai lần; lỗi round cũ không mất lựa chọn round mới.
- [ ] Ranking ngày/tuần/tháng/tất cả, thưởng, chat, review/lịch sử khớp quyền và dữ liệu WEB.
- [ ] Offline/retry; đóng/nền ngừng polling; mở lại theo trạng thái server.
- [ ] Về Learn/Exam/Wrong/Marked vẫn chạy; WEB và iOS cũ tiếp tục tương thích.

## Public

- [ ] Apple ID ngoài đội phát triển mở và cài 1.0.10 qua link DE/VN.
- [ ] Ghi nhận Unlisted không lên Search; update/TestFlight không đổi Public.
- [ ] Chỉ tạo app record/đổi distribution sau khi thống nhất hướng với chủ app và Apple.
