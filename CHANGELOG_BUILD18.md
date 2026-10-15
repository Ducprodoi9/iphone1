Führerschein Viet-Duc iOS v1.0.3 build18

Patch tối thiểu trên build17, giữ nguyên toàn bộ fix kéo/scroll danh mục học:
1. Thi thử: ở câu cuối bấm Weiter luôn chụp lại danh sách câu đang đánh dấu vàng và nhảy vào vòng xem lại.
2. Trong vòng xem lại, Weiter đi lần lượt qua từng câu đã đánh dấu; hết danh sách mới chuyển sang Auswertung/Nộp bài.
3. Tăng ưu tiên vùng chạm của các nút toolbar/Weiter trên iOS WKWebView để tránh lớp footer/grid chặn thao tác.
4. Giữ nguyên marker tam giác vàng nhỏ, trạng thái đánh dấu phần Học và fix scroll danh mục của build17.
5. CURRENT_PROJECT_VERSION = 18 để upload App Store Connect như một build mới.
