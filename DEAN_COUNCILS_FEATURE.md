# Tính năng Quản lý Hội đồng (Dean/Councils)

## Tổng quan

Tính năng **Quản lý Hội đồng** cho phép Trưởng khoa (DEAN) quản lý danh sách thành viên hội đồng đánh giá cho mỗi đợt đăng ký đề tài. Các thành viên hội đồng được chọn khi tạo hoặc cập nhật đợt đăng ký sẽ được hiển thị và có thể quản lý tại trang này.

## Vị trí trong hệ thống

- **Route**: `/dean/councils`
- **Vai trò truy cập**: DEAN (Trưởng khoa)
- **Menu**: "Quản lý Hội đồng" trong sidebar của Dean
- **Icon**: UsersRound

## Chức năng chính

### 1. Chọn đợt đăng ký
- Hiển thị dropdown để chọn đợt đăng ký
- Mỗi đợt đăng ký hiển thị:
  - Tên đợt đăng ký
  - Trạng thái (Đang mở/Đã đóng)
- Chỉ hiển thị các đợt đăng ký thuộc khoa của Dean đang đăng nhập

### 2. Xem danh sách thành viên hội đồng
Khi đã chọn đợt đăng ký, hiển thị bảng danh sách thành viên gồm:
- **STT**: Số thứ tự
- **Họ tên**: Tên của thành viên hội đồng
- **Email**: Email liên hệ
- **Ngày thêm**: Ngày thành viên được thêm vào hội đồng
- **Hành động**: Nút xóa thành viên khỏi hội đồng

### 3. Thêm thành viên hội đồng
- Mở dialog để chọn giảng viên thêm vào hội đồng
- **Tìm kiếm**: Tìm kiếm giảng viên theo tên hoặc email
- **Chọn nhiều**: Cho phép chọn nhiều giảng viên cùng lúc bằng checkbox
- **Lọc tự động**: Chỉ hiển thị giảng viên chưa có trong hội đồng
- **Xác nhận**: Thêm tất cả giảng viên đã chọn vào hội đồng

### 4. Xóa thành viên hội đồng
- Nút "Xóa" để xóa thành viên khỏi hội đồng
- Xác nhận trước khi xóa
- Cập nhật danh sách ngay lập tức sau khi xóa

## Cấu trúc Database

### Bảng: CallRoundCouncilMember
```prisma
model CallRoundCouncilMember {
  id              String    @id @default(cuid())
  callRoundId     String
  councilMemberId String
  createdAt       DateTime  @default(now())
  
  callRound       CallRound @relation(fields: [callRoundId], references: [id], onDelete: Cascade)
  councilMember   User      @relation(fields: [councilMemberId], references: [id], onDelete: Cascade)
  
  @@unique([callRoundId, councilMemberId])
  @@index([callRoundId])
  @@index([councilMemberId])
}
```

### Quan hệ với CallRound
```prisma
model CallRound {
  // ... các trường khác ...
  availableCouncilMembers CallRoundCouncilMember[]
}
```

### Quan hệ với User
```prisma
model User {
  // ... các trường khác ...
  callRoundCouncilMembers CallRoundCouncilMember[]
}
```

## API Endpoints

### GET /api/dean/council-members
Lấy danh sách thành viên hội đồng theo đợt đăng ký.

**Query Parameters:**
- `callRoundId` (required): ID của đợt đăng ký

**Response:**
```json
{
  "data": [
    {
      "id": "cm_xxx",
      "callRoundId": "cr_xxx",
      "councilMemberId": "user_xxx",
      "createdAt": "2026-03-23T14:24:00.000Z",
      "councilMember": {
        "id": "user_xxx",
        "name": "Nguyễn Văn A",
        "email": "nva@example.com",
        "code": "GV001"
      }
    }
  ]
}
```

### POST /api/dean/council-members
Thêm thành viên vào hội đồng.

**Request Body:**
```json
{
  "callRoundId": "cr_xxx",
  "councilMemberId": "user_xxx"
}
```

**Response:**
```json
{
  "id": "cm_xxx",
  "callRoundId": "cr_xxx",
  "councilMemberId": "user_xxx",
  "createdAt": "2026-03-23T14:24:00.000Z",
  "councilMember": {
    "id": "user_xxx",
    "name": "Nguyễn Văn A",
    "email": "nva@example.com",
    "code": "GV001"
  }
}
```

### DELETE /api/dean/council-members
Xóa thành viên khỏi hội đồng.

**Query Parameters:**
- `callRoundId` (required): ID của đợt đăng ký
- `councilMemberId` (required): ID của thành viên hội đồng

**Response:**
```json
{
  "success": true
}
```

## Cấu trúc Files

### 1. Page Component
**File**: `app/dean/councils/page.tsx`
```typescript
import { CouncilManagement } from '@/components/dean/council-management';

export default function DeanCouncilsPage() {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Quản lý Hội đồng
                </h1>
                <p className="text-muted-foreground mt-1">
                    Tạo và phân công thành viên hội đồng đánh giá 
                    cho các đợt đăng ký đề tài
                </p>
            </div>
            <CouncilManagement />
        </div>
    );
}
```

### 2. Management Component
**File**: `components/dean/council-management.tsx`
- Chứa logic chính cho quản lý hội đồng
- Sử dụng React Query hooks để fetch và mutate data
- Có các chức năng:
  - Chọn đợt đăng ký
  - Hiển thị danh sách thành viên
  - Thêm thành viên mới (với dialog và search)
  - Xóa thành viên

### 3. API Client
**File**: `api/council-members.ts`
```typescript
export interface CouncilMember {
    id: string;
    callRoundId: string;
    councilMemberId: string;
    createdAt: string;
    councilMember: {
        id: string;
        name: string;
        email: string;
        code?: string;
    };
}

export const councilMembersApi = {
    getByCallRound: async (callRoundId: string) => {...},
    assign: async (callRoundId: string, councilMemberId: string) => {...},
    remove: async (callRoundId: string, councilMemberId: string) => {...},
};
```

### 4. React Query Hooks
**File**: `hooks/useCouncilMembers.ts`
```typescript
export function useCouncilMembers(callRoundId: string) {...}
export function useAssignCouncilMember() {...}
export function useRemoveCouncilMember() {...}
```

### 5. API Routes
**File**: `app/api/dean/council-members/route.ts`
- GET: Lấy danh sách thành viên
- POST: Thêm thành viên
- DELETE: Xóa thành viên
- Có authentication check (chỉ DEAN)
- Có validation

## UI Components sử dụng

1. **Card**: Hiển thị các section chính
2. **Select**: Dropdown chọn đợt đăng ký
3. **Table**: Hiển thị danh sách thành viên
4. **Dialog**: Modal thêm thành viên
5. **Input**: Tìm kiếm giảng viên
6. **Checkbox**: Chọn nhiều giảng viên
7. **ScrollArea**: Scroll danh sách giảng viên
8. **Badge**: Hiển thị trạng thái đợt đăng ký
9. **Button**: Các nút hành động
10. **Skeleton**: Loading states

## Flow hoạt động

### 1. Load trang
```
User truy cập /dean/councils
  ↓
Fetch danh sách call rounds của khoa
  ↓
Hiển thị dropdown chọn đợt đăng ký
```

### 2. Chọn đợt đăng ký
```
User chọn call round từ dropdown
  ↓
Fetch danh sách thành viên hội đồng của call round
  ↓
Hiển thị bảng danh sách thành viên
```

### 3. Thêm thành viên
```
User click "Thêm thành viên"
  ↓
Mở dialog, fetch danh sách giảng viên khoa
  ↓
Lọc giảng viên chưa có trong hội đồng
  ↓
User tìm kiếm và chọn giảng viên (checkbox)
  ↓
User click "Thêm vào hội đồng"
  ↓
Gọi API POST cho từng giảng viên được chọn
  ↓
Refresh danh sách thành viên
  ↓
Hiển thị toast thông báo thành công
```

### 4. Xóa thành viên
```
User click nút "Xóa" bên cạnh thành viên
  ↓
Gọi API DELETE với callRoundId và councilMemberId
  ↓
Refresh danh sách thành viên
  ↓
Hiển thị toast thông báo thành công
```

## Quyền truy cập và bảo mật

### Authentication
- Chỉ user đã đăng nhập mới truy cập được
- API routes check session với `getAuthUser()`

### Authorization
- Chỉ role DEAN mới có quyền truy cập
- API routes kiểm tra: `if (session.role !== 'DEAN')`
- Frontend: Route được bảo vệ bởi layout của dean

### Phạm vi dữ liệu
- Dean chỉ xem được call rounds của khoa mình
- Dean chỉ thêm/xóa được giảng viên trong khoa mình
- `useDeanLecturers` hook tự động lọc theo department của Dean

## Quan hệ với các tính năng khác

### 1. Call Rounds Management
- Khi tạo/cập nhật call round, có thể chọn council members
- Council members được lưu vào bảng `CallRoundCouncilMember`
- Trang `/dean/councils` là nơi quản lý chi tiết hơn

### 2. Project Evaluation
- Council members sẽ được dùng để đánh giá projects
- Liên quan đến bảng `CouncilEvaluation`

### 3. Lecturers Management
- Danh sách giảng viên lấy từ `/dean/lecturers`
- Dùng hook `useDeanLecturers` để fetch

## Validation và Error Handling

### Frontend Validation
- Kiểm tra đã chọn call round trước khi thêm
- Kiểm tra đã chọn ít nhất 1 giảng viên
- Disable buttons khi đang loading

### Backend Validation
- Check required parameters (callRoundId, councilMemberId)
- Check duplicate: Không cho thêm thành viên đã tồn tại
- Check authentication và authorization

### Error Messages
- "Unauthorized" (401): Chưa đăng nhập hoặc không phải DEAN
- "callRoundId is required" (400): Thiếu parameter
- "Member already in council" (400): Thành viên đã tồn tại
- "Internal server error" (500): Lỗi server

## Testing

### Manual Testing Checklist
- [ ] Truy cập trang /dean/councils với role DEAN
- [ ] Kiểm tra dropdown hiển thị đúng call rounds
- [ ] Chọn call round và xem danh sách members
- [ ] Thêm giảng viên vào hội đồng
- [ ] Tìm kiếm giảng viên trong dialog
- [ ] Chọn nhiều giảng viên cùng lúc
- [ ] Xóa thành viên khỏi hội đồng
- [ ] Kiểm tra các trường hợp empty state
- [ ] Kiểm tra toast notifications
- [ ] Kiểm tra loading states

### Test Cases
1. **Load page successfully**: Trang load đúng với danh sách call rounds
2. **Select call round**: Hiển thị đúng members của call round
3. **Add single member**: Thêm 1 thành viên thành công
4. **Add multiple members**: Thêm nhiều thành viên cùng lúc
5. **Search lecturers**: Tìm kiếm hoạt động đúng
6. **Remove member**: Xóa thành viên thành công
7. **Duplicate prevention**: Không cho thêm member trùng
8. **Empty states**: Hiển thị đúng khi không có data
9. **Permission check**: Non-DEAN không truy cập được

## Future Enhancements

### Gợi ý cải tiến
1. **Bulk operations**: Xóa nhiều thành viên cùng lúc
2. **Member roles**: Phân vai trò trong hội đồng (Chủ tịch, Thư ký, Ủy viên)
3. **Assignment history**: Lịch sử thay đổi hội đồng
4. **Council templates**: Lưu template hội đồng để tái sử dụng
5. **Email notifications**: Thông báo cho thành viên khi được thêm vào hội đồng
6. **Workload tracking**: Theo dõi số lượng projects mỗi member đang đánh giá
7. **Export功能**: Xuất danh sách hội đồng ra Excel/PDF
8. **Conflict detection**: Cảnh báo nếu member có xung đột lịch

## Troubleshooting

### Vấn đề thường gặp

**1. Không hiển thị call rounds**
- Kiểm tra Dean có department chưa
- Kiểm tra có call rounds nào được tạo chưa
- Check API response trong Network tab

**2. Không thêm được member**
- Kiểm tra member đã tồn tại trong hội đồng chưa
- Kiểm tra call round có bị khóa không
- Check console để xem error message

**3. Danh sách không refresh sau khi thêm/xóa**
- Kiểm tra React Query cache invalidation
- Refresh page để force reload

**4. Search không hoạt động**
- Kiểm tra input value binding
- Kiểm tra filter logic trong code

## Tài liệu liên quan

- [Call Rounds Management](./COUNCIL_MEMBERS_FEATURE.md)
- [User Management](./README.md)
- [Database Schema](./prisma/schema.prisma)
- [API Documentation](./types/api.schema.ts)

---

**Tạo bởi**: Cline AI Assistant  
**Ngày tạo**: 23/03/2026  
**Phiên bản**: 1.0
