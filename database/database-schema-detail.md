# CHI TIẾT CẤU TRÚC CƠ SỞ DỮ LIỆU
## Hệ thống Quản lý Nghiên cứu Khoa học (URMS)
### Database: SQL Server

---

## 3.2.1 Bảng [User] (Người dùng)

### Bảng 3.1: Cấu trúc bảng [User]

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của người dùng |
| 2 | code | NVARCHAR(50) | UNIQUE | Mã người dùng (MSSV/MAGV) |
| 3 | name | NVARCHAR(255) | NOT NULL | Họ và tên đầy đủ |
| 4 | email | NVARCHAR(255) | UNIQUE, NOT NULL | Địa chỉ email đăng nhập |
| 5 | password | NVARCHAR(255) | NULLABLE | Mật khẩu đã mã hóa |
| 6 | dateOfBirth | DATETIME2 | NULLABLE | Ngày sinh |
| 7 | gender | NVARCHAR(20) | CHECK (MALE/FEMALE/OTHER) | Giới tính |
| 8 | phone | NVARCHAR(20) | NULLABLE | Số điện thoại liên hệ |
| 9 | address | NVARCHAR(MAX) | NULLABLE | Địa chỉ liên hệ |
| 10 | role | NVARCHAR(20) | NOT NULL, DEFAULT 'LECTURER' | Vai trò (STUDENT, LECTURER, DEAN, ADMIN, COUNCIL, LEADER) |
| 11 | department | NVARCHAR(255) | NULLABLE | Tên khoa (legacy field) |
| 12 | departmentId | NVARCHAR(50) | FOREIGN KEY | ID khoa quản lý |
| 13 | majorId | NVARCHAR(50) | FOREIGN KEY | ID chuyên ngành |
| 14 | classId | NVARCHAR(50) | FOREIGN KEY | ID lớp học |
| 15 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo tài khoản |
| 16 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_User_Department → Department(id)
- FK_User_Major → Major(id)
- FK_User_Class → Class(id)

---

## 3.2.2 Bảng Department (Khoa/Phòng ban)

### Bảng 3.2: Cấu trúc bảng Department

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của khoa |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã khoa (VD: "CS", "IT") |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên khoa |
| 4 | description | NVARCHAR(MAX) | NULLABLE | Mô tả chi tiết về khoa |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

---

## 3.2.3 Bảng Major (Chuyên ngành)

### Bảng 3.3: Cấu trúc bảng Major

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của chuyên ngành |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã chuyên ngành |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên chuyên ngành |
| 4 | description | NVARCHAR(MAX) | NULLABLE | Mô tả chi tiết |
| 5 | departmentId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID khoa quản lý |
| 6 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 7 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Major_Department → Department(id) ON DELETE CASCADE

---

## 3.2.4 Bảng Class (Lớp học)

### Bảng 3.4: Cấu trúc bảng Class

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của lớp |
| 2 | code | NVARCHAR(50) | UNIQUE, NOT NULL | Mã lớp học |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên lớp học |
| 4 | majorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID chuyên ngành |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Class_Major → Major(id) ON DELETE CASCADE

---

## 3.2.5 Bảng Room (Phòng họp)

### Bảng 3.5: Cấu trúc bảng Room

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của phòng |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên phòng |
| 3 | code | NVARCHAR(50) | NOT NULL | Mã phòng |
| 4 | capacity | INT | NULLABLE | Sức chứa |
| 5 | description | NVARCHAR(MAX) | NULLABLE | Mô tả |
| 6 | departmentId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID khoa quản lý |
| 7 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái hoạt động |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 9 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Room_Department → Department(id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_Room_Code_Department (code, departmentId)

---

## 3.2.6 Bảng CallRound (Đợt đăng ký đề tài)

### Bảng 3.6: Cấu trúc bảng CallRound

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của đợt |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên đợt đăng ký |
| 3 | description | NVARCHAR(MAX) | NULLABLE | Mô tả chi tiết về đợt đăng ký |
| 4 | registrationStartDate | DATETIME2 | NOT NULL | Thời gian bắt đầu đăng ký |
| 5 | registrationEndDate | DATETIME2 | NOT NULL | Thời gian kết thúc đăng ký |
| 6 | projectStartDate | DATETIME2 | NULLABLE | Thời gian bắt đầu thực hiện đề tài |
| 7 | projectEndDate | DATETIME2 | NULLABLE | Thời gian dự kiến kết thúc đề tài |
| 8 | reviewDeadline | DATETIME2 | NULLABLE | Hạn chót duyệt đề tài |
| 9 | reportingStartDate | DATETIME2 | NULLABLE | Thời gian bắt đầu báo cáo tiến độ |
| 10 | startDate | DATETIME2 | NOT NULL | Thời gian bắt đầu (legacy) |
| 11 | endDate | DATETIME2 | NOT NULL | Thời gian kết thúc (legacy) |
| 12 | maxProjects | INT | NULLABLE | Số lượng đề tài tối đa |
| 13 | budgetLimit | DECIMAL(12,2) | NULLABLE | Ngân sách tối đa cho đợt |
| 14 | requirements | NVARCHAR(MAX) | NULLABLE | Yêu cầu, điều kiện đăng ký |
| 15 | guidelines | NVARCHAR(MAX) | NULLABLE | Hướng dẫn đăng ký |
| 16 | contactInfo | NVARCHAR(MAX) | NULLABLE | Thông tin liên hệ |
| 17 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái hoạt động |
| 18 | isLocked | BIT | NOT NULL, DEFAULT 0 | Khóa chỉnh sửa |
| 19 | applicableFor | NVARCHAR(20) | NOT NULL, DEFAULT 'STUDENT' | Đối tượng áp dụng (STUDENT, LECTURER, BOTH) |
| 20 | approvalStatus | NVARCHAR(30) | NOT NULL, DEFAULT 'APPROVED' | Trạng thái phê duyệt (PENDING_APPROVAL, APPROVED, REJECTED) |
| 21 | createdById | NVARCHAR(50) | NULLABLE | ID người tạo |
| 22 | createdByRole | NVARCHAR(20) | NULLABLE | Vai trò người tạo |
| 23 | approvedById | NVARCHAR(50) | NULLABLE | ID admin duyệt |
| 24 | approvalNote | NVARCHAR(MAX) | NULLABLE | Ghi chú khi duyệt/từ chối |
| 25 | approvedAt | DATETIME2 | NULLABLE | Thời điểm duyệt |
| 26 | templateId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID mẫu báo cáo tiến độ |
| 27 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 28 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_CallRound_Template → ProgressReportTemplate(id)

**Bảng liên kết Many-to-Many:**

### Bảng 3.6.1: CallRound_Department

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID đợt đăng ký |
| 2 | departmentId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID khoa |

### Bảng 3.6.2: CallRound_Major

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID đợt đăng ký |
| 2 | majorId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID chuyên ngành |

### Bảng 3.6.3: CallRound_Class

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | callRoundId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID đợt đăng ký |
| 2 | classId | NVARCHAR(50) | PRIMARY KEY, FOREIGN KEY | ID lớp học |

---

## 3.2.7 Bảng ProjectType (Loại đề tài)

### Bảng 3.7: Cấu trúc bảng ProjectType

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của loại đề tài |
| 2 | name | NVARCHAR(255) | UNIQUE, NOT NULL | Tên loại đề tài |
| 3 | budgetCap | DECIMAL(12,2) | NULLABLE | Trần ngân sách |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 5 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

---

## 3.2.8 Bảng Project (Đề tài nghiên cứu)

### Bảng 3.8: Cấu trúc bảng Project

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của đề tài |
| 2 | code | NVARCHAR(50) | UNIQUE, NULLABLE | Mã đề tài |
| 3 | title | NVARCHAR(500) | NOT NULL | Tên đề tài |
| 4 | objective | NVARCHAR(MAX) | NOT NULL | Mục tiêu đề tài |
| 5 | expectedOutput | NVARCHAR(MAX) | NULLABLE | Sản phẩm dự kiến |
| 6 | proposalFileUrl | NVARCHAR(500) | NULLABLE | URL file thuyết minh |
| 7 | budgetRequested | DECIMAL(12,2) | NULLABLE | Kinh phí đề xuất |
| 8 | budgetApproved | DECIMAL(12,2) | NULLABLE | Kinh phí được duyệt |
| 9 | status | NVARCHAR(30) | NOT NULL, DEFAULT 'DRAFT' | Trạng thái đề tài |
| 10 | overdueReportCount | INT | NOT NULL, DEFAULT 0 | Số báo cáo quá hạn |
| 11 | budgetSuspended | BIT | NOT NULL, DEFAULT 0 | Đình chỉ kinh phí |
| 12 | leaderId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID chủ nhiệm đề tài |
| 13 | deanReviewerId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID trưởng khoa duyệt |
| 14 | instructorId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID giảng viên hướng dẫn |
| 15 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID đợt đăng ký |
| 16 | projectTypeId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID loại đề tài |
| 17 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 18 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Project_Leader → [User](id)
- FK_Project_DeanReviewer → [User](id)
- FK_Project_Instructor → [User](id)
- FK_Project_CallRound → CallRound(id)
- FK_Project_ProjectType → ProjectType(id)

---

## 3.2.9 Bảng ProgressReportTemplate (Mẫu báo cáo tiến độ)

### Bảng 3.9: Cấu trúc bảng ProgressReportTemplate

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của mẫu |
| 2 | name | NVARCHAR(255) | NOT NULL | Tên mẫu báo cáo |
| 3 | description | NVARCHAR(MAX) | NULLABLE | Mô tả mẫu |
| 4 | isActive | BIT | NOT NULL, DEFAULT 1 | Trạng thái hoạt động |
| 5 | createdById | NVARCHAR(50) | NULLABLE | ID người tạo |
| 6 | createdByRole | NVARCHAR(20) | NULLABLE | Vai trò người tạo |
| 7 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 8 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

---

## 3.2.10 Bảng ProgressReportTemplateItem (Mục trong mẫu báo cáo)

### Bảng 3.10: Cấu trúc bảng ProgressReportTemplateItem

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | templateId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID mẫu báo cáo |
| 3 | weekNumber | INT | NOT NULL | Số tuần |
| 4 | weekLabel | NVARCHAR(255) | NOT NULL | Nhãn tuần |
| 5 | taskDescription | NVARCHAR(MAX) | NOT NULL | Mô tả nhiệm vụ |
| 6 | contentGuideline | NVARCHAR(MAX) | NULLABLE | Hướng dẫn nội dung |
| 7 | expectedResult | NVARCHAR(MAX) | NULLABLE | Kết quả dự kiến |
| 8 | orderIndex | INT | NOT NULL | Thứ tự hiển thị |
| 9 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 10 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_TemplateItem_Template → ProgressReportTemplate(id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_TemplateItem_Week (templateId, weekNumber)

**Indexes:**
- IX_TemplateItem_Order (templateId, orderIndex)

---

## 3.2.11 Bảng ProgressReport (Báo cáo tiến độ)

### Bảng 3.11: Cấu trúc bảng ProgressReport

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đề tài |
| 3 | week | INT | NULLABLE | Tuần báo cáo |
| 4 | fromDate | DATETIME2 | NULLABLE | Ngày bắt đầu kỳ báo cáo |
| 5 | toDate | DATETIME2 | NULLABLE | Ngày kết thúc kỳ báo cáo |
| 6 | tasks | NVARCHAR(MAX) | NULLABLE | Nhiệm vụ đã làm |
| 7 | performedContent | NVARCHAR(MAX) | NULLABLE | Nội dung thực hiện |
| 8 | results | NVARCHAR(MAX) | NULLABLE | Kết quả đạt được |
| 9 | reportContent | NVARCHAR(MAX) | NULLABLE | Nội dung báo cáo |
| 10 | periodLabel | NVARCHAR(255) | NOT NULL | Nhãn kỳ báo cáo |
| 11 | summary | NVARCHAR(MAX) | NOT NULL | Tóm tắt |
| 12 | fileUrl | NVARCHAR(500) | NULLABLE | URL file báo cáo |
| 13 | mentorReview | NVARCHAR(MAX) | NULLABLE | Nhận xét giảng viên |
| 14 | mentorScore | FLOAT | NULLABLE | Điểm đánh giá |
| 15 | submittedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian nộp |
| 16 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 17 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_ProgressReport_Project → Project(id) ON DELETE CASCADE

---

## 3.2.12 Bảng ProjectRegistration (Đăng ký đề tài)

### Bảng 3.12: Cấu trúc bảng ProjectRegistration

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID người đăng ký |
| 3 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID đợt đăng ký |
| 4 | title | NVARCHAR(500) | NOT NULL | Tên đề tài |
| 5 | objective | NVARCHAR(MAX) | NOT NULL | Mục tiêu đề tài |
| 6 | expectedOutput | NVARCHAR(MAX) | NULLABLE | Sản phẩm dự kiến |
| 7 | teamMembers | NVARCHAR(MAX) | NULLABLE | Thông tin thành viên (JSON) |
| 8 | status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Trạng thái (PENDING, APPROVED, CANCELED, REJECTED) |
| 9 | cancelReason | NVARCHAR(MAX) | NULLABLE | Lý do hủy |
| 10 | instructorId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID giảng viên hướng dẫn |
| 11 | instructorStatus | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Trạng thái GVHD (PENDING, ACCEPTED, REJECTED) |
| 12 | facultyStatus | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Trạng thái khoa (PENDING, APPROVED, REJECTED) |
| 13 | facultyReviewerId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID người duyệt khoa |
| 14 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 15 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_ProjectReg_User → [User](id) ON DELETE CASCADE
- FK_ProjectReg_CallRound → CallRound(id)
- FK_ProjectReg_Instructor → [User](id)
- FK_ProjectReg_FacultyReviewer → [User](id)

---

## 3.2.13 Bảng Council (Hội đồng đánh giá)

### Bảng 3.13: Cấu trúc bảng Council

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đợt đăng ký |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên hội đồng |
| 4 | description | NVARCHAR(MAX) | NULLABLE | Mô tả |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Council_CallRound → CallRound(id) ON DELETE CASCADE

**Indexes:**
- IX_Council_CallRound (callRoundId)

---

## 3.2.14 Bảng CouncilMemberAssignment (Phân công thành viên hội đồng)

### Bảng 3.14: Cấu trúc bảng CouncilMemberAssignment

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | councilId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID hội đồng |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID thành viên hội đồng |
| 4 | role | NVARCHAR(100) | NULLABLE | Vai trò (Chủ tịch, Thư ký, Ủy viên) |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_CouncilMember_Council → Council(id) ON DELETE CASCADE
- FK_CouncilMember_User → [User](id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_CouncilMember (councilId, councilMemberId)

**Indexes:**
- IX_CouncilMember_Council (councilId)
- IX_CouncilMember_Member (councilMemberId)

---

## 3.2.15 Bảng ProjectCouncilAssignment (Phân công đề tài cho hội đồng)

### Bảng 3.15: Cấu trúc bảng ProjectCouncilAssignment

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | councilId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID hội đồng |
| 3 | projectRegistrationId | NVARCHAR(50) | FOREIGN KEY, NOT NULL, UNIQUE | ID đăng ký đề tài |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_ProjectCouncil_Council → Council(id) ON DELETE CASCADE
- FK_ProjectCouncil_Registration → ProjectRegistration(id) ON DELETE CASCADE

**Indexes:**
- IX_ProjectCouncil_Council (councilId)

---

## 3.2.16 Bảng CouncilEvaluation (Đánh giá hội đồng)

### Bảng 3.16: Cấu trúc bảng CouncilEvaluation

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đề tài |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID thành viên hội đồng |
| 4 | score | INT | NOT NULL | Điểm đánh giá |
| 5 | decision | NVARCHAR(20) | NOT NULL, CHECK (PASS/NEED_REVISION/FAIL) | Kết quả |
| 6 | comment | NVARCHAR(MAX) | NULLABLE | Nhận xét |
| 7 | evaluatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian đánh giá |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_Evaluation_Project → Project(id) ON DELETE CASCADE
- FK_Evaluation_CouncilMember → [User](id)

---

## 3.2.17 Bảng FundingDisbursement (Giải ngân kinh phí)

### Bảng 3.17: Cấu trúc bảng FundingDisbursement

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đề tài |
| 3 | amount | DECIMAL(12,2) | NOT NULL | Số tiền giải ngân |
| 4 | disbursedAt | DATETIME2 | NOT NULL | Ngày giải ngân |
| 5 | voucherNo | NVARCHAR(100) | NULLABLE | Số chứng từ |
| 6 | voucherFileUrl | NVARCHAR(500) | NULLABLE | URL file chứng từ |
| 7 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_Disbursement_Project → Project(id) ON DELETE CASCADE

---

## 3.2.18 Bảng ExtensionRequest (Đơn gia hạn)

### Bảng 3.18: Cấu trúc bảng ExtensionRequest

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đề tài |
| 3 | requestedMonths | INT | NOT NULL | Số tháng gia hạn |
| 4 | reason | NVARCHAR(MAX) | NOT NULL | Lý do gia hạn |
| 5 | status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Trạng thái (PENDING, APPROVED, REJECTED) |
| 6 | submittedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian nộp |
| 7 | reviewedAt | DATETIME2 | NULLABLE | Thời gian xem xét |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 9 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Extension_Project → Project(id) ON DELETE CASCADE

---

## 3.2.19 Bảng Notification (Thông báo)

### Bảng 3.19: Cấu trúc bảng Notification

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID người nhận |
| 3 | type | NVARCHAR(50) | NOT NULL, CHECK | Loại thông báo |
| 4 | title | NVARCHAR(255) | NOT NULL | Tiêu đề thông báo |
| 5 | message | NVARCHAR(MAX) | NOT NULL | Nội dung thông báo |
| 6 | link | NVARCHAR(500) | NULLABLE | URL liên kết |
| 7 | isRead | BIT | NOT NULL, DEFAULT 0 | Đã đọc chưa |
| 8 | metadata | NVARCHAR(MAX) | NULLABLE | Dữ liệu bổ sung (JSON) |
| 9 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 10 | readAt | DATETIME2 | NULLABLE | Thời gian đọc |

**Foreign Keys:**
- FK_Notification_User → [User](id) ON DELETE CASCADE

**Indexes:**
- IX_Notification_User_Read (userId, isRead)
- IX_Notification_User_Created (userId, createdAt)

---

## 3.2.20 Bảng Post (Bài viết/Tin tức)

### Bảng 3.20: Cấu trúc bảng Post

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | title | NVARCHAR(255) | NOT NULL | Tiêu đề bài viết |
| 3 | content | NVARCHAR(MAX) | NOT NULL | Nội dung bài viết |
| 4 | audience | NVARCHAR(20) | NOT NULL, DEFAULT 'ALL' | Đối tượng (LECTURERS, STUDENTS, DEPARTMENT, ALL) |
| 5 | status | NVARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Trạng thái (PENDING, APPROVED, REJECTED) |
| 6 | authorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID tác giả |
| 7 | authorRole | NVARCHAR(20) | NOT NULL | Vai trò tác giả |
| 8 | departmentId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID khoa |
| 9 | approvedById | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID người duyệt |
| 10 | approvedAt | DATETIME2 | NULLABLE | Thời gian duyệt |
| 11 | rejectionReason | NVARCHAR(MAX) | NULLABLE | Lý do từ chối |
| 12 | publishedAt | DATETIME2 | NULLABLE | Thời gian đăng |
| 13 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 14 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

---

## 3.2.21 Bảng OfficeMeeting (Cuộc họp văn phòng)

### Bảng 3.21: Cấu trúc bảng OfficeMeeting

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đề tài |
| 3 | instructorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID giảng viên hướng dẫn |
| 4 | target | NVARCHAR(20) | NOT NULL | Đối tượng mục tiêu (GROUP/LEADER) |
| 5 | memberUserIds | NVARCHAR(MAX) | NOT NULL | Danh sách ID thành viên (JSON) |
| 6 | meetingAt | DATETIME2 | NOT NULL | Thời gian họp |
| 7 | location | NVARCHAR(500) | NOT NULL | Địa điểm |
| 8 | roomId | NVARCHAR(50) | FOREIGN KEY, NULLABLE | ID phòng họp |
| 9 | note | NVARCHAR(MAX) | NULLABLE | Ghi chú |
| 10 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |
| 11 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật cuối |

**Foreign Keys:**
- FK_Meeting_Project → Project(id) ON DELETE CASCADE
- FK_Meeting_Instructor → [User](id)
- FK_Meeting_Room → Room(id) ON DELETE SET NULL

**Indexes:**
- IX_Meeting_Project (projectId)
- IX_Meeting_Instructor (instructorId)
- IX_Meeting_Room (roomId)

---

## 3.2.22 Bảng OfficeMeetingView (Lượt xem cuộc họp)

### Bảng 3.22: Cấu trúc bảng OfficeMeetingView

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | meetingId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID cuộc họp |
| 3 | userId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID người dùng |
| 4 | isRead | BIT | NOT NULL, DEFAULT 0 | Đã xem chưa |
| 5 | readAt | DATETIME2 | NULLABLE | Thời gian đọc |

**Foreign Keys:**
- FK_MeetingView_Meeting → OfficeMeeting(id) ON DELETE CASCADE
- FK_MeetingView_User → [User](id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_MeetingView (meetingId, userId)

**Indexes:**
- IX_MeetingView_User (userId)

---

## 3.2.23 Bảng CallRoundInstructor (Giảng viên hướng dẫn đợt đăng ký)

### Bảng 3.23: Cấu trúc bảng CallRoundInstructor

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đợt đăng ký |
| 3 | instructorId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID giảng viên hướng dẫn |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_CallRoundInstructor_CallRound → CallRound(id) ON DELETE CASCADE
- FK_CallRoundInstructor_User → [User](id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_CallRoundInstructor (callRoundId, instructorId)

**Indexes:**
- IX_CallRoundInstructor_CallRound (callRoundId)
- IX_CallRoundInstructor_Instructor (instructorId)

---

## 3.2.24 Bảng CallRoundCouncilMember (Thành viên hội đồng đợt đăng ký)

### Bảng 3.24: Cấu trúc bảng CallRoundCouncilMember

| STT | Tên trường | Kiểu dữ liệu SQL Server | Ràng buộc | Mô tả |
|-----|-----------|------------------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID đợt đăng ký |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | ID thành viên hội đồng |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo |

**Foreign Keys:**
- FK_CallRoundCouncil_CallRound → CallRound(id) ON DELETE CASCADE
- FK_CallRoundCouncil_User → [User](id) ON DELETE CASCADE

**Unique Constraints:**
- UQ_CallRoundCouncilMember (callRoundId, councilMemberId)

**Indexes:**
- IX_CallRoundCouncil_CallRound (callRoundId)
- IX_CallRoundCouncil_Member (councilMemberId)

---

## 3.2.25 Bảng Enums (Các giá trị CHECK trong SQL Server)

### Bảng 3.25.1: Enum Role (Vai trò)

| Giá trị | Mô tả |
|---------|-------|
| STUDENT | Sinh viên |
| LECTURER | Giảng viên |
| DEAN | Trưởng khoa |
| ADMIN | Quản trị viên |
| COUNCIL | Thành viên hội đồng |
| LEADER | Ban giám hiệu |

### Bảng 3.25.2: Enum Gender (Giới tính)

| Giá trị | Mô tả |
|---------|-------|
| MALE | Nam |
| FEMALE | Nữ |
| OTHER | Khác |

### Bảng 3.25.3: Enum ProjectStatus (Trạng thái đề tài)

| Giá trị | Mô tả |
|---------|-------|
| DRAFT | Bản nháp |
| SUBMITTED | Đã nộp |
| DEAN_APPROVED | Trưởng khoa duyệt |
| DEAN_REVISION | Cần sửa đổi |
| ADMIN_REVIEW | Admin đang xem xét |
| COUNCIL_EVALUATING | Hội đồng đang đánh giá |
| APPROVED | Đã phê duyệt |
| IN_PROGRESS | Đang thực hiện |
| COMPLETED | Hoàn thành |
| REJECTED | Bị từ chối |
| SUSPENDED | Đình chỉ |

### Bảng 3.25.4: Enum ReviewDecision (Kết quả đánh giá)

| Giá trị | Mô tả |
|---------|-------|
| PASS | Đạt |
| NEED_REVISION | Cần sửa đổi |
| FAIL | Không đạt |

### Bảng 3.25.5: Enum RequestStatus (Trạng thái yêu cầu)

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Chờ xử lý |
| APPROVED | Đã duyệt |
| REJECTED | Bị từ chối |

### Bảng 3.25.6: Enum CallRoundApprovalStatus (Trạng thái phê duyệt đợt)

| Giá trị | Mô tả |
|---------|-------|
| PENDING_APPROVAL | Chờ admin duyệt |
| APPROVED | Đã duyệt |
| REJECTED | Bị từ chối |

### Bảng 3.25.7: Enum ApplicableFor (Đối tượng áp dụng)

| Giá trị | Mô tả |
|---------|-------|
| STUDENT | Chỉ sinh viên |
| LECTURER | Chỉ giảng viên |
| BOTH | Cả hai |

### Bảng 3.25.8: Enum RegistrationStatus (Trạng thái đăng ký)

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Chờ xử lý |
| APPROVED | Đã duyệt |
| CANCELED | Đã hủy |
| REJECTED | Bị từ chối |

### Bảng 3.25.9: Enum InstructorStatus (Trạng thái GVHD)

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Chờ xác nhận |
| ACCEPTED | Đã chấp nhận |
| REJECTED | Từ chối |

### Bảng 3.25.10: Enum FacultyStatus (Trạng thái duyệt khoa)

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Chờ xử lý |
| APPROVED | Đã duyệt |
| REJECTED | Bị từ chối |

### Bảng 3.25.11: Enum NotificationType (Loại thông báo)

| Giá trị | Mô tả |
|---------|-------|
| PROJECT_STATUS_CHANGE | Thay đổi trạng thái đề tài |
| REGISTRATION_STATUS_CHANGE | Thay đổi trạng thái đăng ký |
| PROGRESS_REPORT_SUBMITTED | Đã nộp báo cáo tiến độ |
| PROGRESS_REPORT_REVIEWED | Đã xem xét báo cáo tiến độ |
| EXTENSION_REQUEST_SUBMITTED | Đã nộp đơn gia hạn |
| EXTENSION_REQUEST_REVIEWED | Đã xem xét đơn gia hạn |
| CALL_ROUND_APPROVED | Đợt đăng ký đã duyệt |
| CALL_ROUND_REJECTED | Đợt đăng ký bị từ chối |
| INSTRUCTOR_ASSIGNED | Đã chỉ định GVHD |
| DEAN_REVIEW_ASSIGNED | Đã phân công trưởng khoa duyệt |
| COUNCIL_EVALUATION_SUBMITTED | Đã nộp đánh giá hội đồng |
| FUNDING_DISBURSED | Đã giải ngân kinh phí |

### Bảng 3.25.12: Enum PostAudience (Đối tượng bài viết)

| Giá trị | Mô tả |
|---------|-------|
| LECTURERS | Giảng viên |
| STUDENTS | Sinh viên |
| DEPARTMENT | Khoa |
| ALL | Tất cả |

### Bảng 3.25.13: Enum PostStatus (Trạng thái bài viết)

| Giá trị | Mô tả |
|---------|-------|
| PENDING | Chờ duyệt |
| APPROVED | Đã duyệt |
| REJECTED | Bị từ chối |

---

## SƠ ĐỒ QUAN HỆ GIỮA CÁC BẢNG

```
Department (1) ──── (N) Major (1) ──── (N) Class
     │                      │                    │
     │                      │                    │
     ├─── (N) [User]        ├─── (N) [User]      ├─── (N) [User]
     │                      │
     ├─── (N) Room          ├─── (N) CallRound
     │                      │
     └─── (N) Post          └─── (N) CallRound_Department
                            └─── (N) CallRound_Major
                            └─── (N) CallRound_Class
                            └─── (N) CallRoundInstructor
                            └─── (N) CallRoundCouncilMember
                            └─── (N) Council
                            └─── (N) ProjectRegistration
                            └─── (N) Project

[User] (1) ──── (N) Project (as leader)
[User] (1) ──── (N) CouncilEvaluation
[User] (1) ──── (N) Notification
[User] (1) ──── (N) Post
[User] (1) ──── (N) ProjectRegistration

Project (1) ──── (N) ProgressReport
Project (1) ──── (N) CouncilEvaluation
Project (1) ──── (N) FundingDisbursement
Project (1) ──── (N) ExtensionRequest
Project (1) ──── (N) OfficeMeeting

Council (1) ──── (N) CouncilMemberAssignment
Council (1) ──── (N) ProjectCouncilAssignment

OfficeMeeting (1) ──── (N) OfficeMeetingView
Room (1) ──── (N) OfficeMeeting
```

---

## THỐNG KÊ TỔNG QUAN

| Danh mục | Số lượng |
|----------|----------|
| Bảng chính | 23 |
| Bảng liên kết (Many-to-Many) | 3 |
| Bảng con (Chi tiết) | 1 |
| Tổng số bảng | 27 |
| Enum/Check Constraint | 13 |
| Foreign Keys | ~40 |
| Indexes | ~15 |

---

*Tài liệu được tạo từ SQL Server Schema - Ngày cập nhật: 2026-04-07*