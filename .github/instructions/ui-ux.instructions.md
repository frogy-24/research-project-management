================================================================================
INSTRUCTION UI/UX: HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC (SRMS)
Stack: Next.js, Shadcn UI, Tailwind CSS, pnpm
================================================================================

1. TRIẾT LÝ THIẾT KẾ (DESIGN SYSTEM)
--------------------------------------------------------------------------------
- Phong cách: Institutional Minimalist (Tối giản học thuật).
- Typography: Ưu tiên Font "Inter" hoặc "Geist" (Sans-serif) để đạt độ sắc nét cao.
- Màu sắc (Color Palette):
    + Primary: Slate-900 (#0F172A) cho Sidebar/Text.
    + Accent: Blue-600 (#2563EB) cho các nút hành động (CTA).
    + Background: Gray-50 (#F8FAFC) để tạo cảm giác không gian thoáng đãng.
    + Status: 
        * Đã nghiệm thu: Emerald-500.
        * Đang thực hiện: Amber-500.
        * Bị từ chối: Rose-500.

2. CÀI ĐẶT THIẾT BỊ (TECH SETUP)
--------------------------------------------------------------------------------
Sử dụng pnpm để cài đặt các thành phần cốt lõi của Shadcn UI:

pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card table dialog dropdown-menu tabs scroll-area badge skeleton toast form input select separator

3. CẤU TRÚC GIAO DIỆN (UI ARCHITECTURE)
--------------------------------------------------------------------------------
- Layout: 
    + Sidebar cố định bên trái (Sticky) với hiệu ứng Backdrop-blur nhẹ.
    + Header chứa Search Bar toàn cục (Command Menu - CMD+K) để tìm kiếm nhanh đề tài.
    + Main Content: Sử dụng Scroll-area của Shadcn để quản lý vùng cuộn mượt mà.

- Dashboard:
    + Sử dụng Grid 3 hoặc 4 cột cho các thẻ Card thống kê nhanh.
    + Mỗi Card có hiệu ứng `hover:shadow-md transition-all` để tạo cảm giác tương tác.

- Quản lý danh sách (Data Table):
    + Sử dụng kỹ thuật Client-side sorting/filtering cho danh sách nhỏ và Server-side cho danh sách lớn.
    + Hàng (Row) trong bảng nên có khoảng cách (Padding) rộng để dễ đọc.

4. CHỈ DẪN TRẢI NGHIỆM NGƯỜI DÙNG (UX GUIDELINES)
--------------------------------------------------------------------------------
- Loading State: Tuyệt đối không để màn hình trắng khi đang tải dữ liệu. 
  => Sử dụng <Skeleton /> của Shadcn tương ứng với khung hình của Table/Card.
- Feedback: 
    + Sử dụng `sonner` hoặc `toast` để thông báo khi lưu/xóa/cập nhật thành công.
    + Các nút "Xóa" hoặc "Hủy" quan trọng phải đi kèm Confirm Dialog.
- Form UX:
    + Với các đề tài nghiên cứu có nhiều thông tin, hãy chia nhỏ thành Multi-step Form (Steppers).
    + Validation hiển thị ngay dưới ô Input (Real-time) bằng Zod.

5. HIỆU ỨNG MƯỢT MÀ (ANIMATIONS)
--------------------------------------------------------------------------------
Sử dụng Tailwind transitions hoặc Framer Motion:
- Page transitions: Fade-in khi chuyển trang (opacity 0 to 1).
- Hover effects: scale(1.02) nhẹ cho các thẻ đề tài nổi bật.
- List animations: Các dòng trong bảng xuất hiện tuần tự (Staggered animation).

================================================================================
END OF FILE