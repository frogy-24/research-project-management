# Template Ownership & Authorization

## Tổng quan
Hệ thống quản lý quyền sở hữu và phân quyền cho Progress Report Templates, đảm bảo:
- **DEAN** chỉ có thể sửa/xóa templates do chính họ tạo
- **ADMIN** có quyền sửa/xóa tất cả templates
- UI hiển thị rõ ràng quyền hạn với icon Lock khi không có quyền

## Database Schema

### ProgressReportTemplate Model
```prisma
model ProgressReportTemplate {
  id            String   @id @default(cuid())
  name          String
  description   String?
  isActive      Boolean  @default(true)
  createdById   String   // ID của người tạo
  createdByRole String   // Role của người tạo (ADMIN/DEAN)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  items         ProgressReportTemplateItem[]
  callRounds    CallRound[]
}
```

## API Authorization Logic

### POST /api/progress-templates
- Tự động lưu `createdById` và `createdByRole` từ session
- Yêu cầu authentication (401 nếu không có session)

### PUT /api/progress-templates/[id]
**Authorization Rules:**
1. Kiểm tra authentication (401 nếu không có session)
2. Kiểm tra template có tồn tại không (404 nếu không tìm thấy)
3. Kiểm tra quyền:
   - **ADMIN**: Được phép sửa tất cả templates
   - **DEAN**: Chỉ được sửa template của chính mình (`createdById === userId`)
   - Nếu không có quyền: Trả về 403 với message "Bạn không có quyền chỉnh sửa biểu mẫu này"

### DELETE /api/progress-templates/[id]
**Authorization Rules:**
1. Kiểm tra authentication (401 nếu không có session)
2. Kiểm tra template có tồn tại không (404 nếu không tìm thấy)
3. Kiểm tra quyền:
   - **ADMIN**: Được phép xóa tất cả templates
   - **DEAN**: Chỉ được xóa template của chính mình (`createdById === userId`)
   - Nếu không có quyền: Trả về 403 với message "Bạn không có quyền xóa biểu mẫu này"

## UI Implementation

### Dean Templates Page (`/dean/templates`)

**Permission Check Function:**
```typescript
const canModifyTemplate = (template: TemplateWithItems): boolean => {
  if (!currentUser) return false;
  // ADMIN can modify all templates
  if (currentUser.role === 'ADMIN') return true;
  // DEAN can only modify templates they created
  return template.createdById === currentUser.id;
};
```

**UI Behavior:**
- **Edit Button**: 
  - Disabled nếu `!canModifyTemplate(template)`
  - Icon thay đổi từ `<Edit>` thành `<Lock>` khi không có quyền
  - Tooltip: "Bạn không có quyền chỉnh sửa biểu mẫu này"
  
- **Delete Button**:
  - Disabled nếu `!canModifyTemplate(template)`
  - Tooltip: "Bạn không có quyền xóa biểu mẫu này"

### Admin Templates Page (`/admin/templates`)
- Không cần kiểm tra quyền ownership
- ADMIN luôn có quyền sửa/xóa tất cả templates

## TypeScript Types

```typescript
export type TemplateWithItems = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdById: string;      // NEW
  createdByRole: string;    // NEW
  createdAt: Date;
  updatedAt: Date;
  items: Array<{...}>;
};
```

## Migration

Migration file: `20260323_add_template_ownership.sql`
- Thêm field `createdById` (String, required)
- Thêm field `createdByRole` (String, required)
- Set giá trị mặc định cho existing templates

## Testing Scenarios

### Scenario 1: DEAN tạo và sửa template của mình
1. DEAN login
2. Tạo template mới → Success (createdById = DEAN.id)
3. Sửa template vừa tạo → Success (owner check pass)
4. Xóa template → Success (owner check pass)

### Scenario 2: DEAN cố gắng sửa template của DEAN khác
1. DEAN_A login và tạo template
2. DEAN_B login
3. DEAN_B thấy template của DEAN_A nhưng nút Edit/Delete bị disabled
4. DEAN_B cố call API sửa → 403 Forbidden

### Scenario 3: ADMIN quản lý tất cả templates
1. ADMIN login
2. Xem tất cả templates (của DEAN và ADMIN khác)
3. Sửa bất kỳ template nào → Success
4. Xóa bất kỳ template nào → Success

## Security Notes

✅ **Backend validation**: API luôn check quyền, không chỉ dựa vào UI
✅ **Type-safe**: TypeScript types đảm bảo không thiếu fields
✅ **Clear error messages**: User biết rõ lý do bị từ chối
✅ **Visual feedback**: UI disable buttons và hiển thị Lock icon

## Files Modified

1. `prisma/schema.prisma` - Thêm createdById, createdByRole
2. `prisma/migrations/20260323_add_template_ownership.sql` - Migration
3. `app/api/progress-templates/route.ts` - POST lưu createdBy info
4. `app/api/progress-templates/[id]/route.ts` - PUT/DELETE check ownership
5. `types/progress-template.schema.ts` - Type definition
6. `app/dean/templates/page.tsx` - UI permission check
7. `lib/auth.ts` - Session verification helper

---

**Created:** 2026-03-23  
**Last Updated:** 2026-03-23
