# MÔ TẢ CÁC BẢNG - NHÓM TÀI CHÍNH, THÔNG BÁO & LỊCH HỌP

## 1. Bảng FundingDisbursement (Giải ngân kinh phí)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đề tài nhận kinh phí |
| 3 | amount | DECIMAL(12,2) | NOT NULL | Số tiền giải ngân |
| 4 | disbursedAt | DATETIME2 | NOT NULL | Thời gian giải ngân |
| 5 | voucherNo | NVARCHAR(100) | | Số chứng từ |
| 6 | voucherFileUrl | NVARCHAR(500) | | Đường dẫn file chứng từ |
| 7 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |

**Foreign Keys:**
- `projectId` → `Project(id)` ON DELETE CASCADE

**Lưu ý:**
- Một đề tài có thể có nhiều đợt giải ngân
- Tổng amount không được vượt quá budgetApproved của Project

---

## 2. Bảng ExtensionRequest (Yêu cầu gia hạn)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đề tài xin gia hạn |
| 3 | requestedMonths | INT | NOT NULL | Số tháng xin gia hạn |
| 4 | reason | NVARCHAR(MAX) | NOT NULL | Lý do xin gia hạn |
| 5 | status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK | Trạng thái xét duyệt |
| 6 | submittedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian nộp đơn |
| 7 | reviewedAt | DATETIME2 | | Thời gian xét duyệt |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |
| 9 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Foreign Keys:**
- `projectId` → `Project(id)` ON DELETE CASCADE

**Check Constraints:**
- `status` IN ('PENDING', 'APPROVED', 'REJECTED')

**Lưu ý:**
- Một đề tài có thể gửi nhiều đơn xin gia hạn
- Thường giới hạn số lần gia hạn tối đa (VD: 2 lần)

---

## 3. Bảng Notification (Thông báo)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Người nhận thông báo |
| 3 | type | NVARCHAR(50) | NOT NULL, CHECK | Loại thông báo |
| 4 | title | NVARCHAR(255) | NOT NULL | Tiêu đề thông báo |
| 5 | message | NVARCHAR(MAX) | NOT NULL | Nội dung thông báo |
| 6 | link | NVARCHAR(500) | | Đường dẫn liên quan |
| 7 | isRead | BIT | NOT NULL, DEFAULT 0 | Trạng thái đã đọc |
| 8 | metadata | NVARCHAR(MAX) | | Dữ liệu bổ sung (JSON) |
| 9 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo thông báo |
| 10 | readAt | DATETIME2 | | Thời gian đọc thông báo |

**Foreign Keys:**
- `userId` → `User(id)` ON DELETE CASCADE

**Check Constraints:**
- `type` IN ('PROJECT_STATUS_CHANGE', 'REGISTRATION_STATUS_CHANGE', 'PROGRESS_REPORT_SUBMITTED', 'PROGRESS_REPORT_REVIEWED', 'EXTENSION_REQUEST_SUBMITTED', 'EXTENSION_REQUEST_REVIEWED', 'CALL_ROUND_APPROVED', 'CALL_ROUND_REJECTED', 'INSTRUCTOR_ASSIGNED', 'DEAN_REVIEW_ASSIGNED', 'COUNCIL_EVALUATION_SUBMITTED', 'FUNDING_DISBURSED')

**Indexes:**
- `IX_Notification_User_Read` ON (userId, isRead)
- `IX_Notification_User_Created` ON (userId, createdAt)

**Lưu ý:**
- Thông báo tự động được tạo khi có sự kiện quan trọng
- Hỗ trợ real-time notification qua WebSocket

---

## 4. Bảng OfficeMeeting (Lịch họp)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đề tài liên quan |
| 3 | instructorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Giảng viên tạo lịch |
| 4 | target | NVARCHAR(20) | NOT NULL | Đối tượng họp (GROUP/LEADER) |
| 5 | memberUserIds | NVARCHAR(MAX) | NOT NULL | Danh sách thành viên (JSON array) |
| 6 | meetingAt | DATETIME2 | NOT NULL | Thời gian họp |
| 7 | location | NVARCHAR(500) | NOT NULL | Địa điểm họp |
| 8 | roomId | NVARCHAR(50) | FOREIGN KEY | Phòng họp (nếu có) |
| 9 | note | NVARCHAR(MAX) | | Ghi chú về buổi họp |
| 10 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo lịch |
| 11 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Foreign Keys:**
- `projectId` → `Project(id)` ON DELETE CASCADE
- `instructorId` → `User(id)`
- `roomId` → `Room(id)` ON DELETE SET NULL

**Indexes:**
- `IX_Meeting_Project` ON (projectId)
- `IX_Meeting_Instructor` ON (instructorId)
- `IX_Meeting_Room` ON (roomId)

**Lưu ý:**
- `target = 'GROUP'`: Họp cả nhóm
- `target = 'LEADER'`: Họp riêng với chủ nhiệm
- `memberUserIds`: Lưu dạng JSON array, VD: ["user1", "user2"]

---

## 5. Bảng OfficeMeetingView (Trạng thái xem lịch họp)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | meetingId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Lịch họp |
| 3 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Người xem |
| 4 | isRead | BIT | NOT NULL, DEFAULT 0 | Đã xem lịch chưa |
| 5 | readAt | DATETIME2 | | Thời gian xem |

**Foreign Keys:**
- `meetingId` → `OfficeMeeting(id)` ON DELETE CASCADE
- `userId` → `User(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(meetingId, userId)` - Mỗi người chỉ có 1 trạng thái xem cho 1 lịch họp

**Indexes:**
- `IX_MeetingView_User` ON (userId)

**Lưu ý:**
- Bảng này theo dõi ai đã xem lịch họp
- Giúp GVHD biết sinh viên đã nhận thông báo chưa

---

## Mối quan hệ giữa các bảng

```
Project (1) ----< (N) FundingDisbursement
Project (1) ----< (N) ExtensionRequest
Project (1) ----< (N) OfficeMeeting

User (1) ----< (N) Notification
User (1) ----< (N) OfficeMeeting [as instructor]
User (1) ----< (N) OfficeMeetingView

Room (1) ----< (N) OfficeMeeting

OfficeMeeting (1) ----< (N) OfficeMeetingView
```

---

## Quy trình nghiệp vụ

### 1. Giải ngân kinh phí
- Phòng QLKH tạo bản ghi FundingDisbursement
- Đính kèm chứng từ (voucherFileUrl)
- Hệ thống gửi Notification cho chủ nhiệm đề tài

### 2. Xin gia hạn
- Chủ nhiệm đề tài tạo ExtensionRequest
- Phòng QLKH xét duyệt (APPROVED/REJECTED)
- Nếu được duyệt, cập nhật projectEndDate của Project

### 3. Tạo lịch họp
- GVHD tạo OfficeMeeting
- Hệ thống tự động tạo OfficeMeetingView cho các thành viên
- Gửi Notification cho các thành viên được mời

### 4. Thông báo tự động
- Hệ thống tự động tạo Notification khi:
  + Trạng thái đề tài thay đổi
  + Có báo cáo tiến độ mới
  + Có đánh giá từ GVHD/Hội đồng
  + Có giải ngân mới
