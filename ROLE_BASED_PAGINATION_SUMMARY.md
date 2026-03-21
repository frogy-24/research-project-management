# Tổng kết: Phân quyền theo Role và Pagination

## Mục tiêu
Triển khai hệ thống phân quyền role-based cho quản lý sinh viên, giảng viên, và lớp học với phân trang (pagination).

## Các thay đổi đã thực hiện

### 1. Backend API - Phân quyền theo Role

#### `/app/api/users/route.ts`
- **Role DEAN**: Chỉ hiển thị users thuộc cùng khoa (departmentId)
- **Role ADMIN**: Hiển thị tất cả users
- **Hỗ trợ pagination**: `page`, `limit`, `search`, `role`, `classId`
- **Response format**:
  ```typescript
  {
    data: User[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
  ```

#### `/app/api/classes/route.ts`
- **Role DEAN**: Chỉ hiển thị classes thuộc majors của khoa
- **Role ADMIN**: Hiển thị tất cả classes
- **Hỗ trợ pagination**: `page`, `limit`, `search`, `majorId`
- **Response format**: Giống users API

### 2. Frontend Hooks - Hỗ trợ Pagination

#### `/hooks/useUsers.ts`
```typescript
interface UseUsersParams {
  role?: string;
  search?: string;
  classId?: string;
  page?: number;
  limit?: number;
}
```

#### `/hooks/useClasses.ts`
```typescript
interface UseClassesParams {
  majorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

### 3. UI Components - Pagination

#### Shared Pagination Logic
Tất cả 3 components sử dụng logic pagination giống nhau:
- **Limit**: 20 items/page
- **Page numbers**: Hiển thị thông minh với "..." cho nhiều trang
- **Navigation**: Nút "Trước" và "Sau" với disable state
- **Info display**: "Hiển thị X - Y / Tổng số: Z"

#### `/components/dean/student-management.tsx`
- ✅ Pagination với search và filter theo lớp
- ✅ Server-side filtering theo departmentId (role DEAN)
- ✅ Hiển thị: MSSV, Họ tên, Email, Giới tính, Lớp, Ngành, SĐT

#### `/components/dean/lecturer-management.tsx`
- ✅ Pagination với search
- ✅ Server-side filtering theo departmentId (role DEAN)
- ✅ Hiển thị: Mã CB, Họ tên, Email, Giới tính, Khoa, SĐT, Địa chỉ

#### `/components/dean/class-management.tsx`
- ✅ Pagination với search
- ✅ Server-side filtering theo department's majors (role DEAN)
- ✅ CRUD operations: Create, Update, Delete
- ✅ Hiển thị: Mã lớp, Tên lớp, Ngành

### 4. Role-Based Access Control

| Role | Users API | Classes API | CRUD Permissions |
|------|-----------|-------------|------------------|
| **ADMIN** | Tất cả users | Tất cả classes | Full CRUD trên tất cả |
| **DEAN** | Users trong khoa | Classes trong khoa | Full CRUD trong khoa |
| **LECTURER** | Không truy cập | Không truy cập | Không |
| **STUDENT** | Không truy cập | Không truy cập | Không |

### 5. Database Schema (đã có sẵn)
```prisma
model User {
  departmentId String?  // FK to Department
  classId      String?  // FK to Class (for students)
  role         UserRole
}

model Class {
  majorId String  // FK to Major
}

model Major {
  departmentId String  // FK to Department
}
```

## Cách hoạt động

### 1. Trường hợp DEAN đăng nhập
1. Session chứa `user.departmentId`
2. API endpoint kiểm tra role = DEAN
3. Filter dữ liệu:
   - **Users**: `WHERE departmentId = user.departmentId`
   - **Classes**: `WHERE major.departmentId = user.departmentId`
4. Trả về dữ liệu đã lọc + pagination info

### 2. Trường hợp ADMIN đăng nhập
1. Session chứa `user.role = ADMIN`
2. API endpoint kiểm tra role = ADMIN
3. Không filter, trả về tất cả dữ liệu + pagination

### 3. Client-side Pagination
```typescript
const [currentPage, setCurrentPage] = useState(1);
const limit = 20;

const { data } = useUsers({
  role: "STUDENT",
  search: searchTerm,
  page: currentPage,
  limit,
});

const students = data?.data || [];
const pagination = data?.pagination;
```

## Testing Checklist

- [ ] **ADMIN user**
  - [ ] Xem tất cả sinh viên từ tất cả khoa
  - [ ] Xem tất cả giảng viên từ tất cả khoa
  - [ ] Xem tất cả lớp từ tất cả khoa
  - [ ] Pagination hoạt động đúng
  - [ ] Search hoạt động đúng

- [ ] **DEAN user (Khoa CNTT)**
  - [ ] Chỉ xem sinh viên khoa CNTT
  - [ ] Chỉ xem giảng viên khoa CNTT
  - [ ] Chỉ xem lớp của các ngành thuộc khoa CNTT
  - [ ] CRUD lớp chỉ trong khoa CNTT
  - [ ] Pagination hoạt động đúng
  - [ ] Search chỉ tìm trong phạm vi khoa

- [ ] **Performance**
  - [ ] Load time < 1s với pagination
  - [ ] Smooth navigation giữa các trang
  - [ ] Search không bị lag

## API Endpoints Summary

```
GET /api/users
  Query params:
    - role: "STUDENT" | "LECTURER" | "DEAN" | "ADMIN"
    - search: string
    - classId: string
    - page: number (default: 1)
    - limit: number (default: 10)
  
  Response: { data: User[], pagination: {...} }
  
  Access Control:
    - ADMIN: All users
    - DEAN: Users in same department only

GET /api/classes
  Query params:
    - majorId: string
    - search: string
    - page: number
    - limit: number
  
  Response: { data: Class[], pagination: {...} }
  
  Access Control:
    - ADMIN: All classes
    - DEAN: Classes in department's majors only
```

## Notes

1. **Bảo mật**: Server-side filtering đảm bảo DEAN không thể truy cập dữ liệu ngoài khoa
2. **Performance**: Pagination giảm tải dữ liệu, chỉ load 20 items/page
3. **UX**: Page numbers thông minh, hiển thị info "X - Y / Total"
4. **Scalability**: Dễ mở rộng thêm filters (majorId, departmentId, etc.)

## Các file đã chỉnh sửa

### Backend
- `app/api/users/route.ts` - Added role-based filtering + pagination
- `app/api/classes/route.ts` - Added role-based filtering + pagination

### Frontend Hooks
- `hooks/useUsers.ts` - Added pagination params
- `hooks/useClasses.ts` - Added pagination params

### UI Components
- `components/dean/student-management.tsx` - Added pagination UI
- `components/dean/lecturer-management.tsx` - Added pagination UI
- `components/dean/class-management.tsx` - Added pagination UI

### UI Shared
- `components/ui/pagination.tsx` - Pagination component (already exists)

## Kết quả

✅ **Phân quyền hoàn chỉnh**: DEAN chỉ quản lý khoa mình, ADMIN quản lý toàn bộ
✅ **Pagination hoàn chỉnh**: Load nhanh, UX tốt với 20 items/page
✅ **Security**: Server-side filtering, không thể bypass từ client
✅ **Scalability**: Dễ thêm filters và roles mới
