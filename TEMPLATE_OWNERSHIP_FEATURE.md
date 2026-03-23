# 📋 Tính năng Quản lý Quyền sở hữu Biểu mẫu Tiến độ

## 🎯 Mục tiêu
Cho phép cả **ADMIN** và **DEAN** tạo biểu mẫu tiến độ, trong đó:
- **ADMIN**: Có toàn quyền tạo, sửa, xóa TẤT CẢ biểu mẫu
- **DEAN**: Chỉ có thể tạo, sửa, xóa biểu mẫu **do chính mình tạo**

## ✅ Những thay đổi đã thực hiện

### 1. **Database Schema Update** (`prisma/schema.prisma`)
```prisma
model ProgressReportTemplate {
  id                String   @id @default(cuid())
  name              String
  description       String?  @db.Text
  isActive          Boolean  @default(true)
  
  // Thêm 2 field mới để track ownership
  createdById       String
  createdByRole     Role     @default(ADMIN)
  
  items             ProgressReportTemplateItem[]
  projectRegistrations ProjectRegistration[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([createdById])
  @@index([isActive])
}
```

**Migration**: `20260323_add_template_ownership`

### 2. **Type Schema Update** (`types/progress-template.schema.ts`)
Cập nhật các schema Zod để bao gồm `createdById` và `createdByRole`:

```typescript
export const progressReportTemplateSchema = z.object({
  // ... existing fields
  createdById: z.string(),
  createdByRole: z.enum(["ADMIN", "DEAN", "LECTURER", "STUDENT", "COUNCIL", "LEADER"]),
});
```

### 3. **API Routes Update**

#### **POST `/api/progress-templates/route.ts`**
```typescript
const authUser = await getAuthUser();
if (!authUser) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const template = await prisma.progressReportTemplate.create({
  data: {
    // ... other fields
    createdById: authUser.userId,
    createdByRole: authUser.role,
  },
});
```

#### **PUT `/api/progress-templates/[id]/route.ts`**
```typescript
// Authorization check
if (authUser.role !== "ADMIN" && existingTemplate.createdById !== authUser.userId) {
  return NextResponse.json(
    { error: "Bạn không có quyền chỉnh sửa biểu mẫu này" },
    { status: 403 }
  );
}
```

#### **DELETE `/api/progress-templates/[id]/route.ts`**
```typescript
// Authorization check
if (authUser.role !== "ADMIN" && existingTemplate.createdById !== authUser.userId) {
  return NextResponse.json(
    { error: "Bạn không có quyền xóa biểu mẫu này" },
    { status: 403 }
  );
}
```

### 4. **UI Update - Dean Template Management**
File: `components/dean/call-rounds-management.tsx`

**Hiển thị ownership indicator:**
```tsx
<Badge variant={template.createdByRole === "ADMIN" ? "default" : "secondary"}>
  {template.createdByRole === "ADMIN" ? "Admin" : "Tự tạo"}
</Badge>
```

**Disable Edit/Delete cho template không phải của mình:**
```tsx
const canEdit = template.createdById === user?.id || user?.role === "ADMIN";

<Button disabled={!canEdit}>
  <Pencil className="h-4 w-4" />
</Button>
```

## 🔒 Logic Phân quyền

| Hành động | ADMIN | DEAN (Template của mình) | DEAN (Template của Admin) |
|-----------|-------|--------------------------|---------------------------|
| **Xem danh sách** | ✅ Tất cả | ✅ Tất cả | ✅ Tất cả |
| **Tạo mới** | ✅ | ✅ | N/A |
| **Chỉnh sửa** | ✅ Tất cả | ✅ Chỉ của mình | ❌ |
| **Xóa** | ✅ Tất cả | ✅ Chỉ của mình | ❌ |
| **Kích hoạt/Vô hiệu hóa** | ✅ Tất cả | ✅ Chỉ của mình | ❌ |

## 🧪 Testing Checklist

### Test Cases cho ADMIN:
- [ ] Tạo template mới → `createdByRole` = "ADMIN"
- [ ] Chỉnh sửa template của ADMIN khác → Thành công
- [ ] Chỉnh sửa template của DEAN → Thành công
- [ ] Xóa bất kỳ template nào → Thành công

### Test Cases cho DEAN:
- [ ] Tạo template mới → `createdByRole` = "DEAN"
- [ ] Xem template của ADMIN → Hiển thị badge "Admin", button Edit/Delete bị disable
- [ ] Chỉnh sửa template của chính mình → Thành công
- [ ] Chỉnh sửa template của DEAN khác → Lỗi 403
- [ ] Chỉnh sửa template của ADMIN → Lỗi 403
- [ ] Xóa template của chính mình → Thành công
- [ ] Xóa template của ADMIN → Lỗi 403

## 📝 Migration Command

```bash
# Tạo migration
npx prisma migrate dev --name add_template_ownership

# Hoặc nếu đã có migration
npx prisma migrate deploy
```

## 🔄 Seed Data Update
File `prisma/seed-templates.ts` đã được cập nhật để:
- Template "Biểu mẫu tiến độ chuẩn" → `createdByRole: "ADMIN"`
- Template "Biểu mẫu rút gọn" → `createdByRole: "DEAN"` (cho test)

## 🚀 Deployment Notes

1. **Chạy migration trên production:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Update existing templates:** Nếu có templates cũ không có `createdById`:
   ```sql
   UPDATE "ProgressReportTemplate" 
   SET "createdById" = 'DEFAULT_ADMIN_ID', 
       "createdByRole" = 'ADMIN' 
   WHERE "createdById" IS NULL;
   ```

## 📚 Related Files

### Modified:
- `prisma/schema.prisma`
- `types/progress-template.schema.ts`
- `app/api/progress-templates/route.ts`
- `app/api/progress-templates/[id]/route.ts`
- `components/dean/call-rounds-management.tsx`
- `prisma/seed-templates.ts`

### Created:
- `prisma/migrations/20260323_add_template_ownership/`
- `TEMPLATE_OWNERSHIP_FEATURE.md` (this file)

## 💡 Future Enhancements

1. **Audit Log**: Track who created/modified templates
2. **Template Sharing**: Cho phép DEAN chia sẻ template với DEAN khác
3. **Template Versioning**: Lưu lịch sử thay đổi của template
4. **Template Categories**: Phân loại template theo lĩnh vực

---
**Ngày tạo:** 23/03/2026  
**Người thực hiện:** Cline AI Assistant  
**Status:** ✅ Hoàn thành
