# Triển khai Phân quyền theo Vai trò (Role-Based Access Control)

## Tổng quan
Hệ thống đã được cập nhật để hỗ trợ phân quyền theo vai trò:
- **ADMIN**: Xem và quản lý toàn bộ hệ thống (tất cả khoa, sinh viên, giảng viên, lớp)
- **DEAN (Trưởng khoa)**: Chỉ xem và quản lý dữ liệu thuộc khoa của mình
- Các vai trò khác: Quyền hạn phù hợp với chức năng

## Các thay đổi đã thực hiện

### 1. Thư viện Xác thực (`lib/auth-helpers.ts`)
Tạo file mới chứa các hàm helper:
- `getAuthUser()`: Lấy thông tin người dùng đang đăng nhập từ session
- `getDepartmentFilter(user)`: Trả về departmentId nếu user là DEAN
- `isAdmin(user)`: Kiểm tra xem user có phải ADMIN không

### 2. API Routes - Role-Based Filtering

#### `/api/users/route.ts`
- **GET**: Áp dụng bộ lọc theo vai trò
  - DEAN: Chỉ thấy users thuộc khoa của mình
  - ADMIN: Thấy tất cả users, có thể lọc theo khoa
- **POST**: Giữ nguyên (tạo user mới)

#### `/api/classes/route.ts`
- **GET**: Áp dụng bộ lọc theo vai trò
  - DEAN: Chỉ thấy lớp thuộc các ngành của khoa mình
  - ADMIN: Thấy tất cả lớp, có thể lọc theo khoa
- **POST**: Giữ nguyên (tạo lớp mới)

### 3. Components cho DEAN

#### `components/dean/student-management.tsx`
- Hiển thị danh sách sinh viên thuộc khoa
- Tìm kiếm theo tên, email, MSSV
- Lọc theo lớp
- Chỉ đọc (read-only), không có CRUD

#### `components/dean/lecturer-management.tsx`
- Hiển thị danh sách giảng viên thuộc khoa
- Tìm kiếm theo tên, email, mã CB
- Chỉ đọc (read-only), không có CRUD

#### `components/dean/class-management.tsx`
- Hiển thị danh sách lớp thuộc khoa
- **CRUD đầy đủ**: Tạo, sửa, xóa lớp
- Tìm kiếm theo tên, mã lớp, ngành
- DEAN có thể quản lý lớp thuộc khoa của mình

### 4. Pages cho DEAN

#### `app/dean/students/page.tsx`
Sử dụng `StudentManagement` component

#### `app/dean/lecturers/page.tsx`
Sử dụng `LecturerManagement` component

#### `app/dean/classes/page.tsx`
Sử dụng `ClassManagement` component với CRUD đầy đủ

## Cách hoạt động

### Flow cho DEAN
1. DEAN đăng nhập vào hệ thống
2. Truy cập các trang quản lý (students, lecturers, classes)
3. API kiểm tra session và lấy thông tin user
4. Nếu user là DEAN → Chỉ trả về data thuộc `departmentId` của user
5. Hiển thị data đã được lọc trên giao diện

### Flow cho ADMIN
1. ADMIN đăng nhập vào hệ thống
2. Truy cập các trang quản lý
3. API kiểm tra session → ADMIN thấy tất cả data
4. ADMIN có thể lọc theo khoa nếu muốn

## Quyền CRUD

| Vai trò | Sinh viên | Giảng viên | Lớp học |
|---------|-----------|------------|---------|
| ADMIN   | Full CRUD | Full CRUD  | Full CRUD |
| DEAN    | Chỉ xem   | Chỉ xem    | **Full CRUD (khoa mình)** |

## Kiểm tra

### Test với DEAN
1. Đăng nhập với tài khoản DEAN (ví dụ: dean.cntt@university.edu)
2. Truy cập `/dean/students` → Chỉ thấy sinh viên khoa CNTT
3. Truy cập `/dean/lecturers` → Chỉ thấy giảng viên khoa CNTT
4. Truy cập `/dean/classes` → Chỉ thấy lớp thuộc khoa CNTT
5. Thử tạo/sửa/xóa lớp → Chỉ được thao tác với lớp của khoa mình

### Test với ADMIN
1. Đăng nhập với tài khoản ADMIN (admin@university.edu)
2. Truy cập `/admin/users` → Thấy tất cả users
3. Có thể lọc theo khoa cụ thể
4. Full quyền CRUD

## Bảo mật

- **Authentication**: Kiểm tra session trước khi trả data
- **Authorization**: Lọc data theo departmentId nếu không phải ADMIN
- **Database Level**: Sử dụng Prisma where clauses để đảm bảo chỉ query đúng data
- **Frontend**: Components chỉ hiển thị data đã được API lọc

## Mở rộng trong tương lai

Có thể dễ dàng mở rộng cho các vai trò khác:
- HEAD_OF_MAJOR (Trưởng ngành): Chỉ xem data thuộc ngành
- COUNCIL_MEMBER: Chỉ xem đề tài được phân công
- v.v.

Chỉ cần thêm logic vào `getDepartmentFilter()` hoặc tạo helper functions mới tương tự.
