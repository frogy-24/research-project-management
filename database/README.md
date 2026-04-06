# TÀI LIỆU CƠ SỞ DỮ LIỆU - HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC

## Tổng quan

Hệ thống quản lý nghiên cứu khoa học bao gồm **26 bảng** được chia thành 5 nhóm chức năng chính.

---

## Cấu trúc thư mục

```
database/
├── README.md                      # File này - Hướng dẫn tổng quan
├── sqlserver-schema.sql           # Script SQL Server đầy đủ
├── tables-01-organization.md      # Mô tả nhóm Tổ chức & Người dùng (5 bảng)
├── tables-02-project.md           # Mô tả nhóm Đề tài & Báo cáo (4 bảng)
├── tables-03-callround.md         # Mô tả nhóm Đợt đăng ký (8 bảng)
├── tables-04-council.md           # Mô tả nhóm Hội đồng (4 bảng)
└── tables-05-others.md            # Mô tả nhóm Tài chính, Thông báo, Lịch họp (5 bảng)
```

---

## Danh sách các bảng theo nhóm

### 📁 Nhóm 1: Tổ chức & Người dùng (5 bảng)
> Chi tiết: [tables-01-organization.md](./tables-01-organization.md)

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 1 | **Department** | Khoa/Đơn vị trong trường |
| 2 | **Major** | Ngành học thuộc các khoa |
| 3 | **Class** | Lớp học thuộc các ngành |
| 4 | **Room** | Phòng họp của các khoa |
| 5 | **User** | Người dùng hệ thống (Sinh viên, Giảng viên, Admin...) |

### 📋 Nhóm 2: Đề tài & Báo cáo (4 bảng)
> Chi tiết: [tables-02-project.md](./tables-02-project.md)

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 6 | **ProjectType** | Loại đề tài (Cấp cơ sở, Cấp Bộ...) |
| 7 | **Project** | Đề tài nghiên cứu |
| 8 | **ProjectRegistration** | Đơn đăng ký đề tài |
| 9 | **ProgressReport** | Báo cáo tiến độ thực hiện |

### 📅 Nhóm 3: Đợt đăng ký & Mẫu báo cáo (8 bảng)
> Chi tiết: [tables-03-callround.md](./tables-03-callround.md)

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 10 | **ProgressReportTemplate** | Mẫu báo cáo tiến độ |
| 11 | **ProgressReportTemplateItem** | Chi tiết các tuần trong mẫu |
| 12 | **CallRound** | Đợt đăng ký đề tài |
| 13 | **CallRound_Department** | Đợt áp dụng cho các khoa |
| 14 | **CallRound_Major** | Đợt áp dụng cho các ngành |
| 15 | **CallRound_Class** | Đợt áp dụng cho các lớp |
| 16 | **CallRoundInstructor** | GVHD được chỉ định trong đợt |
| 17 | **CallRoundCouncilMember** | Thành viên hội đồng được chỉ định |

### 👥 Nhóm 4: Hội đồng & Đánh giá (4 bảng)
> Chi tiết: [tables-04-council.md](./tables-04-council.md)

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 18 | **Council** | Hội đồng thẩm định |
| 19 | **CouncilMemberAssignment** | Phân công thành viên hội đồng |
| 20 | **ProjectCouncilAssignment** | Phân công đề tài cho hội đồng |
| 21 | **CouncilEvaluation** | Đánh giá của hội đồng |

### 💰 Nhóm 5: Tài chính, Thông báo & Lịch họp (5 bảng)
> Chi tiết: [tables-05-others.md](./tables-05-others.md)

| STT | Tên bảng | Mô tả |
|-----|----------|-------|
| 22 | **FundingDisbursement** | Giải ngân kinh phí |
| 23 | **ExtensionRequest** | Yêu cầu gia hạn đề tài |
| 24 | **Notification** | Thông báo hệ thống |
| 25 | **OfficeMeeting** | Lịch họp với GVHD |
| 26 | **OfficeMeetingView** | Trạng thái xem lịch họp |

---

## Sơ đồ quan hệ tổng quan

```
┌─────────────┐
│ Department  │──┬──< Major ──< Class
└─────────────┘  │
                 ├──< Room
                 └──< User ──┬──< Project ──┬──< ProgressReport
                             │               ├──< FundingDisbursement
                             │               ├──< ExtensionRequest
                             │               ├──< OfficeMeeting
                             │               └──< CouncilEvaluation
                             │
                             ├──< ProjectRegistration
                             ├──< Notification
                             └──< CallRoundInstructor

┌─────────────────────┐
│ ProgressReportTemplate │──< ProgressReportTemplateItem
└─────────────────────┘
         │
         └──< CallRound ──┬──< CallRound_Department
                          ├──< CallRound_Major
                          ├──< CallRound_Class
                          ├──< CallRoundInstructor
                          ├──< CallRoundCouncilMember
                          ├──< Project
                          ├──< ProjectRegistration
                          └──< Council ──┬──< CouncilMemberAssignment
                                         └──< ProjectCouncilAssignment
```

---

## Hướng dẫn sử dụng

### 1. Cài đặt Database

```sql
-- Chạy file SQL Server script
sqlcmd -S localhost -i sqlserver-schema.sql
```

Hoặc mở file `sqlserver-schema.sql` trong SQL Server Management Studio và Execute.

### 2. Tra cứu thông tin bảng

- **Xem tổng quan**: Đọc file README.md này
- **Xem chi tiết từng nhóm**: Mở file `tables-XX-*.md` tương ứng
- **Xem SQL script**: Mở file `sqlserver-schema.sql`

### 3. Format mô tả bảng

Mỗi bảng được mô tả theo format chuẩn:

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| ... | ... | ... | ... | ... |

Kèm theo:
- **Foreign Keys**: Danh sách khóa ngoại
- **Check Constraints**: Ràng buộc kiểm tra giá trị
- **Unique Constraints**: Ràng buộc duy nhất
- **Indexes**: Chỉ mục để tối ưu truy vấn
- **Lưu ý**: Các quy tắc nghiệp vụ quan trọng

---

## Thông tin kỹ thuật

### Kiểu dữ liệu sử dụng

- **NVARCHAR(n)**: Chuỗi Unicode (hỗ trợ tiếng Việt)
- **DATETIME2**: Ngày giờ chính xác
- **DECIMAL(12,2)**: Số thập phân cho tiền tệ
- **INT**: Số nguyên
- **BIT**: Boolean (0/1)
- **NVARCHAR(MAX)**: Text dài, JSON

### Quy ước đặt tên

- **Bảng**: PascalCase (VD: `ProjectRegistration`)
- **Trường**: camelCase (VD: `createdAt`, `userId`)
- **Foreign Key**: `FK_<Table>_<ReferencedTable>`
- **Index**: `IX_<Table>_<Column(s)>`
- **Unique Constraint**: `UQ_<Table>_<Column(s)>`

### Trường chuẩn

Hầu hết các bảng đều có:
- `id`: Primary Key (NVARCHAR(50))
- `createdAt`: Thời gian tạo (DATETIME2)
- `updatedAt`: Thời gian cập nhật (DATETIME2)

---

## Luồng dữ liệu chính

### 1. Đăng ký đề tài
```
User → ProjectRegistration → Council → CouncilEvaluation → Project
```

### 2. Thực hiện đề tài
```
Project → ProgressReport → Notification (to Instructor)
```

### 3. Giải ngân
```
Project → FundingDisbursement → Notification (to Leader)
```

### 4. Họp định kỳ
```
Instructor → OfficeMeeting → OfficeMeetingView → Notification
```

---

## Liên hệ & Hỗ trợ

- **Tài liệu API**: Xem thư mục `/api`
- **Prisma Schema**: Xem file `/prisma/schema.prisma`
- **UML Diagrams**: Xem thư mục `/uml`

---

**Phiên bản**: 1.0  
**Cập nhật**: 03/04/2026  
**Tổng số bảng**: 26
