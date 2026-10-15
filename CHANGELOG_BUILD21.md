# Führerschein Viet-Duc iOS v1.0.3 build21

Patch tối thiểu trên build20:
1. Giữ nguyên fix scroll Danh mục/Học của build20.
2. Giữ nguyên luồng câu cuối -> duyệt lần lượt các câu đánh dấu vàng.
3. Ở câu đánh dấu cuối cùng, nút Auswertung/Nộp bài gọi submit trực tiếp thay vì quay qua state confirm trung gian, tránh trạng thái bấm Nộp bài nhưng không phản hồi trên WKWebView iOS.
4. Không thay đổi backend/API/UI khác.
5. CURRENT_PROJECT_VERSION = 21.
