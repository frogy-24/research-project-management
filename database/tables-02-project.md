# MÔ TẢ CÁC BẢNG - NHÓM ĐỀ TÀI & BÁO CÁO

## 1. Bảng ProjectType (Loại đề tài)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của loại đề tài |
| 2 | name | NVARCHAR(255) | UNIQUE, NOT NULL | Tên loại đề tài (VD: Cấp cơ sở, Cấp Bộ) |
| 3 | budgetCap | DECIMAL(12,2) | | Định mức kinh phí tối đa |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 5 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

---

## 2. Bảng Project (Đề tài)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của đề tài |
| 2 | code | NVARCHAR(50) | UNIQUE | Mã số đề tài (được cấp sau khi phê duyệt) |
| 3 | title | NVARCHAR(500) | NOT NULL | Tên đề tài nghiên cứu |
| 4 | objective | NVARCHAR(MAX) | NOT NULL | Mục tiêu nghiên cứu |
| 5 | expectedOutput | NVARCHAR(MAX) | | Sản phẩm dự kiến |
| 6 | proposalFileUrl | NVARCHAR(500) | | Đường dẫn file thuyết minh |
| 7 | budgetRequested | DECIMAL(12,2) | | Kinh phí đề xuất |
| 8 | budgetApproved | DECIMAL(12,2) | | Kinh phí được phê duyệt |
| 9 | status | NVARCHAR(30) | NOT NULL, DEFAULT 'DRAFT', CHECK | Trạng thái đề tài |
| 10 | overdueReportCount | INT | NOT NULL, DEFAULT 0 | Số lần nộp báo cáo trễ hạn |
| 11 | budgetSuspended | BIT | NOT NULL, DEFAULT 0 | Trạng thái đình chỉ kinh phí |
| 12 | leaderId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Chủ nhiệm đề tài |
| 13 | deanReviewerId | NVARCHAR(50) | FOREIGN KEY | Trưởng khoa phụ trách duyệt |
| 14 | instructorId | NVARCHAR(50) | FOREIGN KEY | Giảng viên hướng dẫn |
| 15 | callRoundId | NVARCHAR(50) | FOREIGN KEY | Đợt đăng ký |
| 16 | projectTypeId | NVARCHAR(50) | FOREIGN KEY | Loại đề tài |
| 17 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo đề tài |
| 18 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `leaderId` → `User(id)`
- `deanReviewerId` → `User(id)`
- `instructorId` → `User(id)`
- `callRoundId` → `CallRound(id)`
- `projectTypeId` → `ProjectType(id)`

**Check Constraints:**
- `status` IN ('DRAFT', 'SUBMITTED', 'DEAN_APPROVED', 'DEAN_REVISION', 'ADMIN_REVIEW', 'COUNCIL_EVALUATING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'SUSPENDED')

---

## 3. Bảng ProjectRegistration (Đăng ký đề tài)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của đơn đăng ký |
| 2 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Người đăng ký (sinh viên/giảng viên) |
| 3 | callRoundId | NVARCHAR(50) | FOREIGN KEY | Đợt đăng ký |
| 4 | title | NVARCHAR(500) | NOT NULL | Tên đề tài đăng ký |
| 5 | objective | NVARCHAR(MAX) | NOT NULL | Mục tiêu nghiên cứu |
| 6 | expectedOutput | NVARCHAR(MAX) | | Sản phẩm dự kiến |
| 7 | teamMembers | NVARCHAR(MAX) | | Danh sách thành viên (JSON) |
| 8 | status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK | Trạng thái đơn đăng ký |
| 9 | cancelReason | NVARCHAR(MAX) | | Lý do hủy/từ chối |
| 10 | instructorId | NVARCHAR(50) | FOREIGN KEY | Giảng viên hướng dẫn được chọn |
| 11 | instructorStatus | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK | Trạng thái duyệt của GVHD |
| 12 | facultyStatus | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK | Trạng thái duyệt của khoa |
| 13 | facultyReviewerId | NVARCHAR(50) | FOREIGN KEY | Người duyệt cấp khoa |
| 14 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian đăng ký |
| 15 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `userId` → `User(id)` ON DELETE CASCADE
- `callRoundId` → `CallRound(id)`
- `instructorId` → `User(id)`
- `facultyReviewerId` → `User(id)`

**Check Constraints:**
- `status` IN ('PENDING', 'APPROVED', 'CANCELED', 'REJECTED')
- `instructorStatus` IN ('PENDING', 'ACCEPTED', 'REJECTED')
- `facultyStatus` IN ('PENDING', 'APPROVED', 'REJECTED')

---

## 4. Bảng ProgressReport (Báo cáo tiến độ)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của báo cáo |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đề tài liên quan |
| 3 | week | INT | | Tuần thứ mấy (nếu theo tuần) |
| 4 | fromDate | DATETIME2 | | Ngày bắt đầu kỳ báo cáo |
| 5 | toDate | DATETIME2 | | Ngày kết thúc kỳ báo cáo |
| 6 | tasks | NVARCHAR(MAX) | | Nhiệm vụ cần thực hiện |
| 7 | performedContent | NVARCHAR(MAX) | | Nội dung đã thực hiện |
| 8 | results | NVARCHAR(MAX) | | Kết quả đạt được |
| 9 | reportContent | NVARCHAR(MAX) | | Nội dung báo cáo chi tiết |
| 10 | periodLabel | NVARCHAR(255) | NOT NULL | Nhãn kỳ báo cáo (VD: Tuần 1, Tháng 3) |
| 11 | summary | NVARCHAR(MAX) | NOT NULL | Tóm tắt báo cáo |
| 12 | fileUrl | NVARCHAR(500) | | Đường dẫn file báo cáo đính kèm |
| 13 | mentorReview | NVARCHAR(MAX) | | Nhận xét của giảng viên hướng dẫn |
| 14 | mentorScore | FLOAT | | Điểm đánh giá của GVHD |
| 15 | submittedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian nộp báo cáo |
| 16 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 17 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật gần nhất |

**Foreign Keys:**
- `projectId` → `Project(id)` ON DELETE CASCADE

---

## Mối quan hệ giữa các bảng

```
ProjectType (1) ----< (N) Project

User (1) ----< (N) Project [as leader]
User (1) ----< (N) Project [as instructor]
User (1) ----< (N) Project [as deanReviewer]

CallRound (1) ----< (N) Project
CallRound (1) ----< (N) ProjectRegistration

User (1) ----< (N) ProjectRegistration

Project (1) ----< (N) ProgressReport
```
