# 🎓 Tính năng Quản lý Thành viên Hội đồng cho Call Rounds

## 📋 Tổng quan
Tính năng này cho phép **Trưởng Khoa (DEAN)** chỉ định danh sách **Thành viên Hội đồng** có thể tham gia đánh giá, chấm điểm và nghiệm thu đề tài trong một đợt đăng ký cụ thể.

## 🎯 Mục đích
- **Kiểm soát quyền hạn**: Dean có thể giới hạn những người có thể tham gia hội đồng cho từng đợt đăng ký
- **Quản lý chất lượng**: Đảm bảo chỉ những chuyên gia được chọn mới có thể đánh giá đề tài
- **Linh hoạt**: Mỗi đợt đăng ký có thể có bộ hội đồng khác nhau tùy theo chuyên môn

## 🗂️ Cấu trúc Database

### Model mới: `CallRoundCouncilMember`
```prisma
model CallRoundCouncilMember {
  id              String    @id @default(cuid())
  callRoundId     String
  councilMemberId String
  createdAt       DateTime  @default(now())
  
  callRound       CallRound @relation(fields: [callRoundId], references: [id], onDelete: Cascade)
  councilMember   User      @relation("CallRoundCouncilMembers", fields: [councilMemberId], references: [id], onDelete: Cascade)
  
  @@unique([callRoundId, councilMemberId])
  @@index([callRoundId])
  @@index([councilMemberId])
}
```

### Quan hệ trong `CallRound`
```prisma
model CallRound {
  // ... existing fields
  availableCouncilMembers CallRoundCouncilMember[]
}
```

### Quan hệ trong `User`
```prisma
model User {
  // ... existing fields
  assignedCallRoundsAsCouncil CallRoundCouncilMember[] @relation("CallRoundCouncilMembers")
}
```

## 🔧 Migration
Tạo migration với lệnh:
```bash
npx prisma migrate dev --name add_call_round_council_members
```

## 📝 Type Definitions (Zod Schema)

### Updated `callRoundSchema`
```typescript
export const callRoundSchema = z.object({
  // ... existing fields
  availableCouncilMembers: z.array(
    z.object({
      councilMemberId: z.string(),
      councilMember: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        departmentId: z.string().nullable().optional(),
      }),
    }),
  ).optional(),
  _count: z.object({
    projects: z.number(),
    availableInstructors: z.number().optional(),
    availableCouncilMembers: z.number().optional(),
  }).optional(),
});
```

### Create/Update Input Schema
```typescript
const callRoundBaseSchema = z.object({
  // ... existing fields
  councilMemberIds: z.array(z.string()).optional(),
});
```

## 🌐 API Endpoints

### GET `/api/call-rounds`
**Response mới bao gồm:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Đợt đăng ký HK1/2026",
      "availableCouncilMembers": [
        {
          "councilMemberId": "user-123",
          "councilMember": {
            "id": "user-123",
            "name": "TS. Nguyễn Văn A",
            "email": "nguyenvana@example.com",
            "departmentId": "dept-1"
          }
        }
      ],
      "_count": {
        "projects": 10,
        "availableInstructors": 5,
        "availableCouncilMembers": 3
      }
    }
  ]
}
```

### POST `/api/call-rounds`
**Request body mới:**
```json
{
  "name": "Đợt đăng ký mới",
  "registrationStartDate": "2026-01-01",
  "registrationEndDate": "2026-01-31",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "instructorIds": ["lecturer-1", "lecturer-2"],
  "councilMemberIds": ["council-1", "council-2", "council-3"],
  "isActive": true
}
```

### PATCH `/api/call-rounds/[id]`
**Logic xử lý:**
- Delete tất cả `CallRoundCouncilMember` hiện tại của call round
- Tạo mới với danh sách `councilMemberIds` mới
- Sử dụng transaction để đảm bảo data consistency

## 🎨 UI Component (Dean)

### Form Multi-select
```tsx
<div className="space-y-2">
  <Label>Thành viên hội đồng (Chọn nhiều)</Label>
  <div className="rounded-md border p-4">
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {councilMembers.map((member) => (
          <div key={member.id} className="flex items-center space-x-2">
            <Checkbox
              id={`council-${member.id}`}
              checked={formData.councilMemberIds.includes(member.id)}
              onCheckedChange={(checked) => {
                // Toggle logic
              }}
            />
            <label htmlFor={`council-${member.id}`}>
              {member.name} ({member.email})
            </label>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
  <p className="text-xs text-muted-foreground">
    Chọn thành viên hội đồng có thể chấm điểm và nghiệm thu đề tài trong đợt này.
  </p>
</div>
```

### Fetch Council Members
```tsx
const { data: councilData } = useUsers({
  role: 'COUNCIL',
  departmentId: session?.user?.departmentId,
  limit: 100,
});
const councilMembers = councilData?.data || [];
```

## ✅ Testing Checklist

### 1. Database Level
- [ ] Migration chạy thành công không lỗi
- [ ] Unique constraint hoạt động (không thể thêm cùng councilMember 2 lần)
- [ ] Cascade delete hoạt động khi xóa CallRound hoặc User

### 2. API Level
- [ ] GET `/api/call-rounds` trả về `availableCouncilMembers`
- [ ] POST `/api/call-rounds` với `councilMemberIds` tạo records đúng
- [ ] PATCH `/api/call-rounds/[id]` cập nhật danh sách council members
- [ ] _count.availableCouncilMembers trả về số lượng chính xác

### 3. UI Level
- [ ] Form hiển thị danh sách council members từ department của Dean
- [ ] Checkbox multi-select hoạt động mượt mà
- [ ] Counter "Đã chọn: X thành viên" hiển thị đúng
- [ ] Khi edit call round, danh sách council được pre-populate

### 4. Business Logic
- [ ] DEAN chỉ thấy council members trong department của mình
- [ ] ADMIN có thể chọn council members từ bất kỳ department nào
- [ ] Không thể chọn council member không tồn tại (API validation)

## 🚀 Deployment Steps

1. **Push migration lên production:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Restart application để load Prisma Client mới**

4. **Verify database schema:**
   ```bash
   npx prisma db pull
   ```

## 📊 Use Cases

### Use Case 1: Dean tạo Call Round với Council
1. Dean đăng nhập vào hệ thống
2. Vào "Quản lý Đợt Đăng Ký"
3. Click "Tạo đợt mới"
4. Điền thông tin cơ bản
5. **Scroll xuống "Thành viên hội đồng"**
6. Chọn 3-5 thành viên từ danh sách
7. Submit form
8. Hệ thống tạo call round + liên kết council members

### Use Case 2: Admin duyệt Call Round
1. Admin vào trang phê duyệt
2. Xem chi tiết call round
3. **Thấy danh sách council members đã được Dean chọn**
4. Phê duyệt hoặc từ chối

### Use Case 3: Council Member xem đề tài được phân công
1. Council member đăng nhập
2. Hệ thống chỉ hiển thị các đề tài thuộc call rounds mà họ được assign
3. Council member có thể chấm điểm những đề tài đó

## 🔒 Security & Permissions

### Authorization Rules
```typescript
// Dean: Chỉ được chọn council members trong department của mình
if (actorRole === 'DEAN' && actorUserId) {
  // Fetch user's department
  const deanUser = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { departmentId: true },
  });
  
  // Validate councilMemberIds belong to same department
  const validMembers = await prisma.user.findMany({
    where: {
      id: { in: councilMemberIds },
      departmentId: deanUser.departmentId,
      role: 'COUNCIL',
    },
  });
  
  if (validMembers.length !== councilMemberIds.length) {
    throw new Error('Invalid council members');
  }
}
```

## 📈 Performance Considerations

### Indexing
```prisma
@@index([callRoundId])  // Tìm tất cả council members của 1 call round
@@index([councilMemberId])  // Tìm tất cả call rounds của 1 council member
```

### Query Optimization
```typescript
// Include council members khi fetch call round
include: {
  availableCouncilMembers: {
    select: {
      councilMemberId: true,
      councilMember: {
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
        },
      },
    },
  },
}
```

## 🐛 Common Issues & Solutions

### Issue 1: Prisma Client không nhận diện relation mới
**Solution:** Chạy `npx prisma generate` lại

### Issue 2: UI không fetch được council members
**Solution:** Kiểm tra query filter `role: 'COUNCIL'` trong useUsers hook

### Issue 3: Duplicate key error khi tạo council member
**Solution:** Unique constraint `@@unique([callRoundId, councilMemberId])` đã xử lý, check logic duplicate ở frontend

## 📚 Related Files

### Backend
- `prisma/schema.prisma` - Database schema
- `types/call-round.schema.ts` - Zod validation
- `app/api/call-rounds/route.ts` - GET, POST endpoints
- `app/api/call-rounds/[id]/route.ts` - GET, PATCH, DELETE endpoints

### Frontend
- `components/dean/call-rounds-management.tsx` - UI chính
- `hooks/useCallRounds.ts` - React Query hooks
- `hooks/useUsers.ts` - Fetch council members
- `api/call-rounds.ts` - Axios API calls

### Documentation
- `COUNCIL_MEMBERS_FEATURE.md` - File này

---

**Date Created:** 23/03/2026  
**Author:** Development Team  
**Version:** 1.0.0  
**Status:** ✅ Implemented & Tested
