# Role-Based Filtering Implementation

## Tổng quan
Hệ thống quản lý sinh viên, giảng viên, và lớp học đã được cập nhật để hỗ trợ filtering theo role:

- **ADMIN**: Xem được toàn bộ dữ liệu của tất cả khoa
- **DEAN (Trưởng khoa)**: Chỉ xem và quản lý dữ liệu thuộc khoa của mình
- **Các role khác**: Được giới hạn theo phạm vi trách nhiệm

## Các thay đổi chính

### 1. Backend API Updates

#### `/app/api/users/route.ts`
- Thêm role-based filtering tự động
- DEAN chỉ thấy users thuộc khoa của mình
- ADMIN thấy tất cả users
- Hỗ trợ filters: role, gender, departmentId, majorId, classId, search
- Pagination: page, limit

```typescript
// Ví dụ query params:
?role=STUDENT&departmentId=xxx&gender=MALE&search=nguyen&page=1&limit=20
```

#### `/app/api/classes/route.ts`
- Đã có role-based filtering sẵn
- DEAN chỉ thấy classes thuộc khoa của mình (qua major.departmentId)
- ADMIN thấy tất cả classes

### 2. Frontend Components

#### Admin User Management (`/components/admin/user-management.tsx`)
**Features:**
- Multi-level filters:
  - Search: tìm theo tên, email, mã số
  - Role filter: STUDENT, LECTURER, DEAN, ADMIN, COUNCIL, LEADER
  - Gender filter: Nam, Nữ, Khác
  - Department filter: cascading với Major và Class
  - Major filter: tự động filter theo Department đã chọn
  - Class filter: tự động filter theo Major đã chọn
- CRUD operations: Create, Read, Update, Delete
- Full user details in form

#### Dean Student Management (`/components/dean/student-management.tsx`)
**Features:**
- Tự động chỉ hiển thị sinh viên thuộc khoa
- Filters:
  - Search: tìm theo tên, email, MSSV
  - Class filter: lọc theo lớp
  - Gender filter: Nam, Nữ, Khác
- Pagination: 20 items/page
- Display: MSSV, họ tên, email, giới tính, lớp, ngành, số điện thoại

#### Dean Lecturer Management (`/components/dean/lecturer-management.tsx`)
**Features:**
- Tự động chỉ hiển thị giảng viên thuộc khoa
- Filters:
  - Search: tìm theo tên, email, MSCB
  - Gender filter: Nam, Nữ, Khác
- Pagination: 20 items/page
- Display: Mã CB, họ tên, email, giới tính, khoa, số điện thoại, địa chỉ

#### Dean Class Management (`/components/dean/class-management.tsx`)
**Features:**
- Tự động chỉ hiển thị lớp thuộc khoa (qua major)
- CRUD operations cho lớp học
- Search: tìm theo tên lớp, mã lớp
- Pagination: 20 items/page
- Display: Mã lớp, tên lớp, ngành

### 3. Auth Helper Functions

#### `/lib/auth-helpers.ts`
```typescript
// Lấy user đang đăng nhập
getAuthUser(): Promise<User | null>

// Lấy departmentId filter cho DEAN
getDepartmentFilter(user: User): string | null

// Kiểm tra có phải ADMIN không
isAdmin(user: User): boolean
```

## Cách hoạt động

### 1. Role-Based Data Access

#### ADMIN
```typescript
// ADMIN thấy tất cả, có thể filter theo department
const users = await useUsers({
  role: "STUDENT",
  departmentId: selectedDept, // optional
  majorId: selectedMajor,     // optional
  classId: selectedClass,     // optional
});
```

#### DEAN
```typescript
// API tự động filter theo departmentId của DEAN
const students = await useUsers({
  role: "STUDENT",
  // departmentId tự động được apply từ auth user
});
```

### 2. Cascading Filters (Admin Only)

Khi ADMIN chọn Department → Major list được filter → Class list được filter:

```typescript
// Filter majors theo department
const filteredMajors = departmentFilter !== "ALL"
  ? majors.filter(m => m.departmentId === departmentFilter)
  : majors;

// Filter classes theo major
const filteredClasses = majorFilter !== "ALL"
  ? classes.filter(c => c.majorId === majorFilter)
  : classes;
```

### 3. Pagination

Tất cả danh sách đều có pagination:
- Default: 20 items/page
- Navigation: Previous, Next, Page numbers
- Smart page display: hiển thị 1...3,4,5...10 cho nhiều trang

## Testing

### Test DEAN Access
1. Login với account có role DEAN
2. Kiểm tra Students tab → chỉ thấy sinh viên thuộc khoa
3. Kiểm tra Lecturers tab → chỉ thấy giảng viên thuộc khoa
4. Kiểm tra Classes tab → chỉ thấy lớp thuộc ngành của khoa

### Test ADMIN Access
1. Login với account có role ADMIN
2. Kiểm tra Users tab → thấy tất cả users
3. Test filters: Department, Major, Class → cascading works
4. Test search và gender filter

### Test Filters
1. Search box: nhập tên/email/mã số
2. Gender filter: chọn Nam/Nữ/Khác
3. Department filter (Admin): chọn khoa → major/class tự động filter
4. Pagination: click page numbers, previous, next

## Database Schema

Role-based filtering dựa trên relationships:

```
User (departmentId, majorId, classId)
  ├── Department
  ├── Major (có departmentId)
  └── Class (có majorId)

Dean User (có departmentId) → chỉ thấy:
  ├── Students (có departmentId match)
  ├── Lecturers (có departmentId match)
  └── Classes (qua major.departmentId match)
```

## Future Enhancements

1. **Export functionality**: Xuất danh sách ra Excel/PDF
2. **Bulk operations**: Import/update nhiều users cùng lúc
3. **Advanced filters**: Lọc theo năm nhập học, trạng thái, etc.
4. **Statistics**: Thống kê số lượng theo khoa/ngành/lớp
5. **Permission management**: Phân quyền chi tiết hơn cho DEAN

## API Endpoints Summary

| Endpoint | Method | Auth | Filters | Role-based |
|----------|--------|------|---------|------------|
| `/api/users` | GET | ✓ | role, gender, dept, major, class, search | ✓ |
| `/api/users` | POST | ✓ | - | ✓ |
| `/api/users/[id]` | PUT | ✓ | - | ✓ |
| `/api/users/[id]` | DELETE | ✓ | - | ✓ |
| `/api/classes` | GET | ✓ | search, major, department | ✓ |
| `/api/classes` | POST | ✓ | - | ✓ |
| `/api/classes/[id]` | PUT | ✓ | - | ✓ |
| `/api/classes/[id]` | DELETE | ✓ | - | ✓ |

## Notes

- Tất cả API calls đều require authentication
- Role-based filtering được apply tự động ở backend
- Frontend chỉ cần gọi API bình thường, không cần xử lý role logic
- Pagination được handle ở cả frontend và backend
- Search là case-insensitive và tìm partial match
