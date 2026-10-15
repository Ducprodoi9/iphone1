# Build 20 – Topics Scroll Regression Fix

- Baseline: build18 MARKED-REVIEW-TAP-FIX.
- Giữ nguyên toàn bộ logic thi: câu cuối -> duyệt câu đã đánh dấu -> Nộp bài.
- Chỉ sửa container cuộn của màn Chủ đề/Học trên iOS WKWebView.
- Khôi phục cách tính chiều cao ổn định theo parent (`calc(100% - 56px)`) như scroll fix cũ, không phụ thuộc `100dvh`.
- Đồng bộ CSS vào source, dist và `ios/.../www`.
- Tăng iOS build number: 18 -> 20 (build19 đã được dùng trên TestFlight).
