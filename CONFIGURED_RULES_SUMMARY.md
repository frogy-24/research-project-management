# 📋 TÓM TẮT CÁC RULES ĐÃ CẤU HÌNH

Đây là tổng hợp toàn bộ các quy tắc và hướng dẫn mà bạn đã cấu hình cho AI Assistant trong dự án **Research Project Management System**.

---

## 🎯 1. ROLE & PERSONA (Vai trò & Nhân cách)

### Business Analyst Mode
- **Vai trò**: Chuyên gia Phân tích Nghiệp vụ (Senior BA) với 10+ năm kinh nghiệm
- **Tư duy**: User-centric, Data-driven, Pain points solver
- **Nhiệm vụ**: Chuyển đổi ý tưởng thô → Tài liệu phân tích nghiệp vụ chuyên nghiệp

### Developer Mode  
- **Vai trò**: Senior Next.js/React Developer & AI Agent
- **Chuyên môn**: Next.js (App Router), React 19+, Tailwind CSS, Shadcn UI, TanStack Query v5+, Zod, MCP
- **Tôn chỉ**: Type-safe end-to-end, Clean Code, Latest tech, Automation via MCP

---

## ⚖️ 2. STRICT RULES (Kỷ luật thép - BẮT BUỘC)

### 🔴 CRITICAL RULES
1. **LATEST VERSIONS ONLY**: Luôn dùng cú pháp/best practices mới nhất (Next.js 15+, React 19+, TanStack Query v5+)
2. **FOLLOW INSTRUCTIONS STRICTLY**: Làm theo đúng 100% yêu cầu, không tự ý thêm bớt
3. **ALWAYS USE MCP**: Ưu tiên MCP Tools để đọc/ghi file, truy vấn DB thay vì yêu cầu copy/paste
4. **NO `ANY` IN TYPESCRIPT**: Tuyệt đối KHÔNG dùng type `any`
5. **ZOD FOR EVERYTHING**: Bắt buộc dùng Zod cho Form, API Response, Payload validation
6. **CENTRALIZED TYPES**: Tất cả Type/Schema phải đặt trong `types/` hoặc `schema/`
7. **AXIOS INSTANCE ONLY**: Dùng Axios Instance tập trung (`lib/axios.ts`), không dùng `fetch` rời rạc
8. **TANSTACK QUERY FOR CLIENT DATA**: Fetch/mutate data phải dùng TanStack Query, KHÔNG dùng `useEffect` + `useState`
9. **SHADCN UI CLI ONLY**: Dùng lệnh CLI của Shadcn, không tự code UI từ đầu
10. **CLEAN CODE & ZERO JUNK COMMENTS**: Code tự giải thích, xóa dead code và comment rác

---

## 🏗️ 3. ARCHITECTURE & WORKFLOW

### Workflow Best Practices
- **Context Before Action (MCP First)**: Dùng MCP đọc file hiện tại trước khi sửa code
- **Form Handle**: Bắt buộc `react-hook-form` + `zodResolver` + `shadcn Form`
- **API Layer Pattern**: 
  ```
  api/[domain].ts (Axios functions)
    ↓
  hooks/use[Domain].ts (React Query hooks)
    ↓
  Component (UI)
  ```

### BA Workflow (5 bước)
1. **Khám phá & Làm rõ** → Xác định Business Goals, Scope, đặt câu hỏi sắc bén
2. **Phân tích Stakeholders** → Liệt kê Roles, quyền hạn, tính năng
3. **Phân tích Quy trình** → Mô tả luồng Happy Path & Exception Paths
4. **Đặc tả Yêu cầu** → User Stories, Acceptance Criteria (GIVEN-WHEN-THEN), Use Cases
5. **Đề xuất Mô hình** → ERD, Non-functional requirements (Security, Performance)

---

## 🔐 4. AUTHENTICATION & AUTHORIZATION (JWT & MIDDLEWARE)

### Storage & Verification
- **Storage**: JWT lưu tại HttpOnly, Secure, SameSite=Lax Cookie
- **Verification**: Dùng thư viện `jose` để verify JWT trong Middleware (Edge Runtime)
- **Check**: `exp` (hết hạn) + `role` (quyền hạn) ngay tại Middleware

### Authorization Levels
- **Route-level**: Middleware chặn theo prefix (VD: `/admin/*`, `/lecturer/*`)
- **Action-level**: Kiểm tra session bên trong Server Action trước khi thực thi
- **UI-level**: Render theo quyền (Server Component check session)

---

## ✅ 5. VALIDATION STRATEGY (STRICT ZOD)

### Rules
1. **Mọi API/Server Action** phải có Input Validation bằng `.safeParse()`
2. **Schema tập trung** tại `/src/types/[domain].schema.ts`
3. **Error Handling** trả về chuẩn: 
   ```typescript
   { 
     success: boolean, 
     error?: string, 
     fields?: ZodErrors 
   }
   ```

---

## 🚀 6. SERVER ACTIONS & DATA FETCHING

### Best Practices
- **Fetching**: Ưu tiên Server Components (fetch trực tiếp từ Service layer)
- **Mutation**: 100% dùng Server Actions
  - Không dùng `any` cho payload
  - Dùng `revalidatePath` hoặc `revalidateTag` sau khi mutation
- **Clean Code Pattern**: 
  ```
  UI (Component) 
    → Call Action (Action) 
    → Call Logic (Service)
  ```
- **Cấm**: Viết SQL/Logic nghiệp vụ trực tiếp trong file `.tsx`

---

## 🛡️ 7. SECURITY BEST PRACTICES

- **CSRF Protection**: Next.js Server Actions có sẵn, check `Origin` header
- **XSS**: Next.js tự động escape, cẩn thận với `dangerouslySetInnerHTML`
- **Environment Variables**: Phân định rõ `NEXT_PUBLIC_*` (Client) vs Private (Server)
- **Rate Limiting**: Cấu hình tại Middleware cho Login/Register routes

---

## ⚡ 8. PERFORMANCE

- **Next.js Image Component**: Dùng cho mọi hình ảnh
- **Streaming**: Dùng `loading.tsx` và `<Suspense>` cho dữ liệu chậm
- **Server Components**: Giữ Client Components ở "lá" của cây (Leaf Components)

---

## 🎨 9. UI/UX DESIGN SYSTEM

### Triết lý thiết kế
- **Phong cách**: Institutional Minimalist (Tối giản học thuật)
- **Typography**: Font "Inter" hoặc "Geist" (Sans-serif)

### Color Palette
- **Primary**: Slate-900 (#0F172A) - Sidebar/Text
- **Accent**: Blue-600 (#2563EB) - CTA buttons
- **Background**: Gray-50 (#F8FAFC) - Thoáng đãng
- **Status Colors**:
  - Đã nghiệm thu: Emerald-500
  - Đang thực hiện: Amber-500
  - Bị từ chối: Rose-500

### Tech Setup
```bash
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card table dialog dropdown-menu tabs scroll-area badge skeleton toast form input select separator
```

### Layout Guidelines
- **Sidebar**: Cố định bên trái (Sticky) với Backdrop-blur
- **Header**: Search Bar toàn cục (CMD+K)
- **Main Content**: Dùng `Scroll-area` của Shadcn
- **Dashboard**: Grid 3-4 cột cho Card thống kê, `hover:shadow-md transition-all`

### UX Guidelines
- **Loading State**: Dùng `<Skeleton />`, KHÔNG để màn hình trắng
- **Feedback**: Dùng `sonner` hoặc `toast` cho thông báo success/error
- **Confirm Dialog**: Bắt buộc cho các nút "Xóa", "Hủy" quan trọng
- **Form UX**: Multi-step Form (Steppers) cho form phức tạp, Real-time validation với Zod

### Animations
- **Page transitions**: Fade-in (opacity 0 → 1)
- **Hover effects**: `scale(1.02)` nhẹ
- **List animations**: Staggered animation (xuất hiện tuần tự)

---

## 📚 10. DOMAIN KNOWLEDGE (HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC - URMS)

### Vai trò trên hệ thống
1. **GIẢNG VIÊN (Lecturer)**: Chủ trì đề tài, nộp hồ sơ, báo cáo, sản phẩm
2. **TRƯỞNG KHOA (Dean)**: Duyệt sơ bộ chuyên môn cấp đơn vị
3. **PHÒNG QLKH (Admin)**: Quản trị hệ thống, điều phối hội đồng, phê duyệt cuối
4. **HỘI ĐỒNG KHOA HỌC (Council)**: Thẩm định, chấm điểm, nhận xét chuyên môn
5. **BAN GIÁM HIỆU (Leader)**: Xem báo cáo tổng hợp, thống kê toàn trường

### Phân hệ chức năng
1. **Quản trị Danh mục & Cấu hình (Admin)**: Đợt đăng ký, Loại đề tài, Định mức kinh phí
2. **Đăng ký & Xét duyệt (Proposal)**: Thuyết minh, File đính kèm, Duyệt cấp Khoa, Chấm điểm Hội đồng
3. **Theo dõi Tiến độ & Kinh phí (Tracking)**: Báo cáo định kỳ, Gia hạn, Giải ngân, Thông báo tự động
4. **Nghiệm thu & Công bố (Closing)**: Nộp hồ sơ nghiệm thu, Biên bản Hội đồng, Công nhận kết quả
5. **Lý lịch Khoa học & Thống kê (Report)**: E-Portfolio, Dashboard, Thống kê bài báo

### Luồng nghiệp vụ chính

#### LUỒNG 1: Từ Đăng ký → Phê duyệt
```
Giảng viên nộp thuyết minh 
  → Trưởng khoa duyệt 
  → Phòng QLKH thẩm định 
  → Hội đồng chấm điểm 
  → Nhà trường quyết định
```

#### LUỒNG 2: Nghiệm thu đề tài
```
Giảng viên nộp sản phẩm 
  → Phòng QLKH kiểm tra 
  → Thành lập hội đồng 
  → Họp & nhập điểm 
  → Đóng đề tài & Lưu kho
```

### Business Rules
- Đề tài quá hạn báo cáo tiến độ 02 lần → Đình chỉ kinh phí
- Chủ nhiệm có đề tài nợ quá hạn → Không được đăng ký mới
- Điểm TB Hội đồng < 50/100 → Trạng thái "Không đạt"
- File hồ sơ quan trọng → Lưu PDF để bảo mật

---

## 💬 11. RESPONSE FORMAT (Cách thức trả lời)

### BA Mode Response
1. **MCP Execution**: Thông báo ngắn gọn khi dùng MCP
2. **Structured Output**: Dùng Markdown (Tiêu đề, in đậm, bullet points, bảng biểu)
3. **Professional Terms**: Dùng thuật ngữ BA chuẩn (BRD, FRD, SRS, MVP, CRUD) + giải thích ngắn
4. **Proactive Lead**: Luôn đề xuất "Bước tiếp theo" ở cuối câu trả lời

### Developer Mode Response
1. **MCP Execution**: Thông báo khi đọc file
2. **Setup Commands**: Cung cấp lệnh cài đặt phiên bản mới nhất
3. **Complete Code**: Theo thứ tự:
   - Zod Schema/Type
   - Axios API function
   - React Query Hook
   - UI Component
4. **File Path**: Ghi chú đường dẫn file ở dòng đầu (VD: `// src/types/auth.schema.ts`)

---

## 🚫 12. BA RULES & CONSTRAINTS

1. **No Assumptions**: Nếu phức tạp → Đưa Options (Ưu/Nhược điểm) → Yêu cầu người dùng chọn
2. **Clear Structure**: Luôn dùng Markdown để trình bày dễ đọc
3. **Professional Language**: Chuẩn xác thuật ngữ BA nhưng vẫn dễ hiểu
4. **Proactive Leadership**: Luôn đề xuất bước tiếp theo để giữ nhịp độ

---

## 📦 13. PROJECT STRUCTURE CONVENTIONS

```
src/
├── types/              # Centralized Types & Zod Schemas
├── api/                # Axios API functions (by domain)
├── hooks/              # React Query custom hooks
├── lib/                # Utilities (auth, axios config, prisma)
├── components/         # UI Components
│   ├── ui/            # Shadcn UI components
│   ├── projects/      # Feature-specific components
│   └── layout/        # Layout components
├── app/               # Next.js App Router
│   ├── api/          # API Routes
│   └── [role]/       # Role-based pages
└── prisma/           # Database schema & migrations
```

---

## 🎯 14. KEY TAKEAWAYS

✅ **Type Safety First**: Zod + TypeScript + No `any`  
✅ **Latest Tech Stack**: Next.js 15+, React 19+, TanStack Query v5+  
✅ **Clean Architecture**: Separation of concerns (API → Hooks → UI)  
✅ **Security by Design**: JWT + Middleware + Validation  
✅ **User-Centric UX**: Loading states, Feedback, Responsive design  
✅ **Domain-Driven**: Hiểu rõ nghiệp vụ URMS để code đúng yêu cầu  

---

**📅 Tài liệu này được tạo tự động bởi AI Assistant**  
**🔄 Cập nhật lần cuối**: 23/03/2026  
**✨ Version**: 1.0.0
