# MÔ TẢ CÁC BẢNG - NHÓM TỔ CHỨC & NGƯỜI DÙNG

## 1. Bảng Department (Khoa/Đơn vị)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của khoa |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã khoa (VD: CNTT, DTVT) |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên đầy đủ của khoa |
| 4 | description | NVARCHAR(MAX) | | Mô tả chi tiết về khoa |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

---

## 2. Bảng Major (Ngành học)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của ngành |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã ngành học |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên ngành học |
| 4 | description | NVARCHAR(MAX) | | Mô tả về ngành học |
| 5 | departmentId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Liên kết với khoa quản lý |
| 6 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 7 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `departmentId` → `Department(id)` ON DELETE CASCADE

---

## 3. Bảng Class (Lớp học)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của lớp |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã lớp học (VD: CNTT-K15A) |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên lớp học |
| 4 | majorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Liên kết với ngành học |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `majorId` → `Major(id)` ON DELETE CASCADE

---

## 4. Bảng Room (Phòng họp)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của phòng |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên phòng họp |
| 3 | code | NVARCHAR(50) | NOT NULL | Mã phòng (VD: B201, A301) |
| 4 | capacity | INT | | Sức chứa của phòng |
| 5 | description | NVARCHAR(MAX) | | Mô tả về phòng họp |
| 6 | departmentId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Khoa quản lý phòng này |
| 7 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái hoạt động (1=Đang dùng, 0=Ngừng) |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 9 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `departmentId` → `Department(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(code, departmentId)` - Mã phòng duy nhất trong mỗi khoa

---

## 5. Bảng User (Người dùng)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của người dùng |
| 2 | code | NVARCHAR(50) | UNIQUE | Mã số sinh viên/giảng viên |
| 3 | name | NVARCHAR(255) | NOT NULL | Họ và tên đầy đủ |
| 4 | email | NVARCHAR(255) | UNIQUE, NOT NULL | Địa chỉ email (dùng để đăng nhập) |
| 5 | password | NVARCHAR(255) | | Mật khẩu đã mã hóa |
| 6 | dateOfBirth | DATETIME2 | | Ngày sinh |
| 7 | gender | NVARCHAR(20) | CHECK (MALE, FEMALE, OTHER) | Giới tính |
| 8 | phone | NVARCHAR(20) | | Số điện thoại |
| 9 | address | NVARCHAR(MAX) | | Địa chỉ liên hệ |
| 10 | role | NVARCHAR(20) | NOT NULL, DEFAULT 'LECTURER', CHECK | Vai trò (STUDENT, LECTURER, DEAN, ADMIN, COUNCIL, LEADER) |
| 11 | department | NVARCHAR(255) | | Tên khoa (trường cũ, giữ để tương thích) |
| 12 | departmentId | NVARCHAR(50) | FOREIGN KEY | Liên kết với khoa |
| 13 | majorId | NVARCHAR(50) | FOREIGN KEY | Liên kết với ngành học |
| 14 | classId | NVARCHAR(50) | FOREIGN KEY | Liên kết với lớp học |
| 15 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo tài khoản |
| 16 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `departmentId` → `Department(id)`
- `majorId` → `Major(id)`
- `classId` → `Class(id)`

**Check Constraints:**
- `gender` IN ('MALE', 'FEMALE', 'OTHER')
- `role` IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')

---

## Mối quan hệ giữa các bảng

```
Department (1) ----< (N) Major
Department (1) ----< (N) Room
Department (1) ----< (N) User

Major (1) ----< (N) Class
Major (1) ----< (N) User

Class (1) ----< (N) User
```
