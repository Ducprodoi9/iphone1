# iOS 1.0.3 Build 11 – Practice auto-next race fix

- Fix lỗi phần Học tự chuyển câu / câu mới tự bị chấm sai dù người dùng chưa bấm.
- Response `submit_practice.php` chỉ được áp dụng nếu vẫn đang ở đúng `question_id`.
- Vô hiệu response cũ khi đổi câu hoặc rời màn Practice.
- Chặn thao tác Weiter lặp trong 450ms để tránh double tap.
- Không thay đổi logic Thi thử, backend hoặc DB.
- Giữ nguyên toàn bộ fix iPad, fullscreen, keyword màu xanh, retry mạng của Build 10.
