# URMS - University Research Management System

Hệ thống quản lý nghiên cứu khoa học đại học (MVP) xây dựng bằng Next.js App Router + Prisma + TanStack Query.

## Chức năng MVP đã triển khai

- Quản lý đề tài nghiên cứu: tạo mới, xem danh sách, xóa.
- Theo dõi trạng thái đề tài theo luồng nghiệp vụ (`DRAFT`, `SUBMITTED`, `DEAN_APPROVED`, ...).
- Ràng buộc nghiệp vụ chính: không cho đăng ký đề tài mới nếu chủ nhiệm đang có đề tài nợ quá hạn ở trạng thái triển khai/đình chỉ.
- API chuẩn hóa response lỗi thành `{ success, error, fields? }`.

## Kiến trúc chính

- `types/`: Zod schema và Type tập trung (`project.schema.ts`, `user.schema.ts`, `api.schema.ts`).
- `api/`: client API bằng Axios (`projects.ts`, `users.ts`).
- `hooks/`: React Query hooks (`useProjects.ts`, `useUsers.ts`).
- `app/api/`: Route Handlers cho `projects` và `users`.
- `components/projects/`: UI nghiệp vụ (`project-form.tsx`, `project-list.tsx`).
- `prisma/schema.prisma`: Data model URMS.

## Cài đặt và chạy

1. Cài dependency:

```bash
pnpm install
```

2. Cấu hình biến môi trường trong file `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
```

3. Generate Prisma client:

```bash
pnpm prisma generate
```

4. Chạy migration (nếu cần):

```bash
pnpm prisma migrate dev
```

5. Chạy ứng dụng:

```bash
pnpm dev
```

Mở `http://localhost:3000` để sử dụng.
