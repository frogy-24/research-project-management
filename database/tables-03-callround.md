# MÔ TẢ CÁC BẢNG - NHÓM ĐỢT ĐĂNG KÝ & MẪU BÁO CÁO

## 1. Bảng ProgressReportTemplate (Mẫu báo cáo tiến độ)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của mẫu |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên mẫu báo cáo |
| 3 | description | NVARCHAR(MAX) | | Mô tả về mẫu |
| 4 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái kích hoạt |
| 5 | createdById | NVARCHAR(50) | | Người tạo mẫu |
| 6 | createdByRole | NVARCHAR(20) | CHECK | Vai trò người tạo |
| 7 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 8 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Check Constraints:**
- `createdByRole` IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')

---

## 2. Bảng ProgressReportTemplateItem (Chi tiết mẫu báo cáo)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | templateId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Mẫu báo cáo |
| 3 | weekNumber | INT | NOT NULL | Số thứ tự tuần |
| 4 | weekLabel | NVARCHAR(255) | NOT NULL | Nhãn tuần (VD: Tuần 1, Tuần 2) |
| 5 | taskDescription | NVARCHAR(MAX) | NOT NULL | Mô tả nhiệm vụ cần làm |
| 6 | contentGuideline | NVARCHAR(MAX) | | Hướng dẫn nội dung báo cáo |
| 7 | expectedResult | NVARCHAR(MAX) | | Kết quả mong đợi |
| 8 | orderIndex | INT | NOT NULL | Thứ tự sắp xếp |
| 9 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 10 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Foreign Keys:**
- `templateId` → `ProgressReportTemplate(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(templateId, weekNumber)` - Mỗi tuần chỉ xuất hiện 1 lần trong mẫu

**Indexes:**
- `IX_TemplateItem_Order` ON (templateId, orderIndex)

---

## 3. Bảng CallRound (Đợt đăng ký)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của đợt |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên đợt đăng ký |
| 3 | description | NVARCHAR(MAX) | | Mô tả chi tiết |
| 4 | registrationStartDate | DATETIME2 | NOT NULL | Ngày bắt đầu nhận đăng ký |
| 5 | registrationEndDate | DATETIME2 | NOT NULL | Ngày kết thúc nhận đăng ký |
| 6 | projectStartDate | DATETIME2 | | Ngày bắt đầu thực hiện đề tài |
| 7 | projectEndDate | DATETIME2 | | Ngày kết thúc dự kiến |
| 8 | reviewDeadline | DATETIME2 | | Hạn chót duyệt đơn |
| 9 | reportingStartDate | DATETIME2 | | Ngày bắt đầu nộp báo cáo |
| 10 | startDate | DATETIME2 | NOT NULL | Ngày bắt đầu (legacy) |
| 11 | endDate | DATETIME2 | NOT NULL | Ngày kết thúc (legacy) |
| 12 | maxProjects | INT | | Số lượng đề tài tối đa |
| 13 | budgetLimit | DECIMAL(12,2) | | Tổng ngân sách cho đợt |
| 14 | requirements | NVARCHAR(MAX) | | Yêu cầu tham gia |
| 15 | guidelines | NVARCHAR(MAX) | | Hướng dẫn đăng ký |
| 16 | contactInfo | NVARCHAR(MAX) | | Thông tin liên hệ |
| 17 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái hoạt động |
| 18 | isLocked | BIT | NOT NULL, DEFAULT 0 | Trạng thái khóa (không cho sửa) |
| 19 | applicableFor | NVARCHAR(20) | NOT NULL, DEFAULT 'STUDENT', CHECK | Đối tượng áp dụng |
| 20 | approvalStatus | NVARCHAR(30) | NOT NULL, DEFAULT 'APPROVED', CHECK | Trạng thái phê duyệt |
| 21 | createdById | NVARCHAR(50) | | Người tạo đợt |
| 22 | createdByRole | NVARCHAR(20) | CHECK | Vai trò người tạo |
| 23 | approvedById | NVARCHAR(50) | | Người phê duyệt |
| 24 | approvalNote | NVARCHAR(MAX) | | Ghi chú phê duyệt |
| 25 | approvedAt | DATETIME2 | | Thời gian phê duyệt |
| 26 | templateId | NVARCHAR(50) | FOREIGN KEY | Mẫu báo cáo áp dụng |
| 27 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 28 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Foreign Keys:**
- `templateId` → `ProgressReportTemplate(id)`

**Check Constraints:**
- `applicableFor` IN ('STUDENT', 'LECTURER', 'BOTH')
- `approvalStatus` IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')
- `createdByRole` IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')

---

## 4. Bảng CallRound_Department (Đợt áp dụng cho các khoa)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Đợt đăng ký |
| 2 | departmentId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Khoa được áp dụng |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE
- `departmentId` → `Department(id)` ON DELETE CASCADE

---

## 5. Bảng CallRound_Major (Đợt áp dụng cho các ngành)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Đợt đăng ký |
| 2 | majorId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Ngành được áp dụng |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE
- `majorId` → `Major(id)` ON DELETE CASCADE

---

## 6. Bảng CallRound_Class (Đợt áp dụng cho các lớp)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Đợt đăng ký |
| 2 | classId | NVARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Lớp được áp dụng |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE
- `classId` → `Class(id)` ON DELETE CASCADE

---

## 7. Bảng CallRoundInstructor (Giảng viên hướng dẫn được chỉ định)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đợt đăng ký |
| 3 | instructorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Giảng viên được chỉ định |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian chỉ định |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE
- `instructorId` → `User(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(callRoundId, instructorId)` - Mỗi GVHD chỉ xuất hiện 1 lần trong đợt

**Indexes:**
- `IX_CallRoundInstructor_CallRound` ON (callRoundId)
- `IX_CallRoundInstructor_Instructor` ON (instructorId)

---

## 8. Bảng CallRoundCouncilMember (Thành viên hội đồng được chỉ định)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đợt đăng ký |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Thành viên hội đồng |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian chỉ định |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE
- `councilMemberId` → `User(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(callRoundId, councilMemberId)` - Mỗi thành viên chỉ xuất hiện 1 lần trong đợt

**Indexes:**
- `IX_CallRoundCouncil_CallRound` ON (callRoundId)
- `IX_CallRoundCouncil_Member` ON (councilMemberId)

---

## Mối quan hệ giữa các bảng

```
ProgressReportTemplate (1) ----< (N) ProgressReportTemplateItem
ProgressReportTemplate (1) ----< (N) CallRound

CallRound (N) ----< (N) Department [via CallRound_Department]
CallRound (N) ----< (N) Major [via CallRound_Major]
CallRound (N) ----< (N) Class [via CallRound_Class]

CallRound (1) ----< (N) CallRoundInstructor
CallRound (1) ----< (N) CallRoundCouncilMember

User (1) ----< (N) CallRoundInstructor
User (1) ----< (N) CallRoundCouncilMember
```
