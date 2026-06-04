# CƠ SỞ DỮ LIỆU URMS - CÁC BẢNG CHÍNH TỪ PRISMA SCHEMA

## 1. Tổng quan

CSDL của URMS dùng **PostgreSQL** và được mô tả bằng `prisma/schema.prisma`.

Hệ thống tập trung vào các nhóm dữ liệu chính:

- Tổ chức đào tạo: khoa, ngành, lớp.
- Người dùng và phân quyền.
- Đợt đăng ký đề tài.
- Đăng ký đề tài và đề tài nghiên cứu.
- Hội đồng và đánh giá.
- Báo cáo tiến độ, nghiệm thu, gia hạn.
- Giải ngân kinh phí.
- Thông báo, bài đăng, lịch họp.
- Tác vụ AI chạy nền bằng RabbitMQ.

---

## 2. Enum nghiệp vụ chính

| Enum | Giá trị chính | Ý nghĩa |
|---|---|---|
| `Role` | `STUDENT`, `LECTURER`, `DEAN`, `ADMIN`, `COUNCIL`, `LEADER`, `DISBURSER` | Vai trò người dùng |
| `ProjectStatus` | `DRAFT`, `SUBMITTED`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, ... | Trạng thái đề tài |
| `RegistrationStatus` | `PENDING`, `APPROVED`, `CANCELED`, `REJECTED` | Trạng thái đăng ký đề tài |
| `CallRoundApprovalStatus` | `PENDING_APPROVAL`, `APPROVED`, `REJECTED` | Trạng thái duyệt đợt đăng ký |
| `InvitationStatus` | `PENDING`, `ACCEPTED`, `REJECTED` | Trạng thái phản hồi lời mời |
| `ReviewDecision` | `PASS`, `NEED_REVISION`, `FAIL` | Kết quả đánh giá hội đồng |
| `DisbursementStatus` | `PENDING`, `APPROVED`, `REJECTED`, `PAID` | Trạng thái giải ngân |
| `ProjectClosingStatus` | `SUBMITTED`, `REVISION_REQUESTED`, `APPROVED` | Trạng thái nghiệm thu/kết thúc |
| `AutoApprovalJobStatus` | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED` | Trạng thái job duyệt AI |
| `ReportJobStatus` | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED` | Trạng thái job sinh báo cáo |

---

## 3. Nhóm tổ chức đào tạo

### 3.1. `Department`

Khoa/phòng ban trong trường.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `code` | `String @unique` | Mã khoa |
| `name` | `String` | Tên khoa |
| `description` | `String?` | Mô tả |
| `createdAt`, `updatedAt` | `DateTime` | Thời gian tạo/cập nhật |

Quan hệ chính:

- 1 khoa có nhiều `Major`.
- 1 khoa có nhiều `User`.
- 1 khoa có nhiều `Room`, `Post`.
- 1 khoa có thể thuộc nhiều `CallRound`.

### 3.2. `Major`

Ngành đào tạo.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `code` | `String @unique` | Mã ngành |
| `name` | `String` | Tên ngành |
| `departmentId` | `String` | FK tới `Department` |

Quan hệ chính:

- 1 ngành thuộc 1 khoa.
- 1 ngành có nhiều `Class`.
- 1 ngành có nhiều `User`.

### 3.3. `Class`

Lớp sinh viên.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `code` | `String @unique` | Mã lớp |
| `name` | `String` | Tên lớp |
| `majorId` | `String` | FK tới `Major` |

Quan hệ chính:

- 1 lớp thuộc 1 ngành.
- 1 lớp có nhiều `User`.

---

## 4. Người dùng và hồ sơ giảng viên

### 4.1. `User`

Bảng người dùng trung tâm của hệ thống.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `code` | `String? @unique` | Mã sinh viên/giảng viên |
| `name` | `String` | Họ tên |
| `email` | `String @unique` | Email đăng nhập/liên hệ |
| `password` | `String?` | Mật khẩu đã hash |
| `role` | `Role` | Vai trò |
| `departmentId` | `String?` | FK tới `Department` |
| `majorId` | `String?` | FK tới `Major` |
| `classId` | `String?` | FK tới `Class` |
| `createdAt`, `updatedAt` | `DateTime` | Thời gian tạo/cập nhật |

Quan hệ chính:

- Sinh viên tạo `ProjectRegistration`.
- Giảng viên hướng dẫn `ProjectRegistration` và `Project`.
- Trưởng khoa/admin duyệt đề tài, bài đăng, giải ngân.
- Thành viên hội đồng có `CouncilEvaluation` và `CouncilMemberAssignment`.
- Người dùng nhận `Notification`.

### 4.2. `Lecturer`

Hồ sơ mở rộng cho giảng viên.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `userId` | `String @unique` | FK tới `User` |
| `staffId` | `String? @unique` | Mã cán bộ |
| `academicRank` | `AcademicRank?` | Học hàm/học vị |
| `degreeName`, `degreeMajor`, `degreeInstitution` | `String?` | Thông tin bằng cấp |
| `researchInterests` | `String[]` | Hướng nghiên cứu |
| `totalProjectsSchoolLevel`, `totalProjectsMinistryLevel`, `totalProjectsStateLevel` | `Int` | Thống kê đề tài |

### 4.3. `LecturerPublication`

Công bố khoa học của giảng viên.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `lecturerId` | `String` | FK tới `Lecturer` |
| `title` | `String` | Tên công bố |
| `publicationType` | `PublicationType` | Loại công bố |
| `venue` | `String?` | Nơi công bố |
| `doi`, `url` | `String?` | Định danh/link |

---

## 5. Đợt đăng ký đề tài

### 5.1. `CallRound`

Đợt mở đăng ký đề tài nghiên cứu.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `name` | `String` | Tên đợt |
| `description` | `String?` | Mô tả |
| `registrationStartDate`, `registrationEndDate` | `DateTime` | Thời gian đăng ký |
| `projectStartDate`, `projectEndDate` | `DateTime?` | Thời gian thực hiện đề tài |
| `reviewDeadline` | `DateTime?` | Hạn duyệt |
| `reportingStartDate` | `DateTime?` | Mốc báo cáo tiến độ |
| `defenseDate` | `DateTime?` | Ngày bảo vệ |
| `maxProjects` | `Int?` | Số đề tài tối đa |
| `budgetLimit` | `Decimal?` | Giới hạn ngân sách |
| `applicableFor` | `ApplicableFor` | Đối tượng áp dụng |
| `approvalStatus` | `CallRoundApprovalStatus` | Trạng thái duyệt |
| `isActive`, `isLocked` | `Boolean` | Trạng thái hoạt động/khóa |

Quan hệ chính:

- Có nhiều `ProjectRegistration`.
- Có nhiều `Project`.
- Có nhiều `Council`.
- Có nhiều giảng viên hướng dẫn qua `CallRoundInstructor`.
- Có nhiều thành viên hội đồng qua `CallRoundCouncilMember`.
- Có file đính kèm qua `CallRoundAttachment`.

### 5.2. `CallRoundAttachment`

File đính kèm của đợt đăng ký.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `callRoundId` | `String` | FK tới `CallRound` |
| `fileName` | `String` | Tên file |
| `fileUrl` | `String` | URL lưu file |
| `fileSize`, `fileType` | `Int?`, `String?` | Thông tin file |

### 5.3. `CallRoundInstructor`

Giảng viên hướng dẫn được mời trong một đợt đăng ký.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `callRoundId` | `String` | FK tới `CallRound` |
| `instructorId` | `String` | FK tới `User` |
| `invitationStatus` | `InvitationStatus` | Trạng thái phản hồi |

Ràng buộc: `@@unique([callRoundId, instructorId])`.

### 5.4. `CallRoundCouncilMember`

Thành viên hội đồng được mời trong một đợt đăng ký.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `callRoundId` | `String` | FK tới `CallRound` |
| `councilMemberId` | `String` | FK tới `User` |
| `invitationStatus` | `InvitationStatus` | Trạng thái phản hồi |

Ràng buộc: `@@unique([callRoundId, councilMemberId])`.

---

## 6. Đăng ký đề tài và đề tài nghiên cứu

### 6.1. `ProjectRegistration`

Đề tài do sinh viên/giảng viên đăng ký trong đợt mở đăng ký.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `userId` | `String` | Người đăng ký |
| `callRoundId` | `String?` | Đợt đăng ký |
| `title` | `String` | Tên đề tài |
| `objective` | `String` | Mục tiêu |
| `expectedOutput` | `String?` | Sản phẩm dự kiến |
| `proposalFiles` | `Json?` | File thuyết minh/hồ sơ |
| `teamMembers` | `Json?` | Thành viên nhóm |
| `status` | `RegistrationStatus` | Trạng thái đăng ký |
| `instructorId` | `String?` | Giảng viên hướng dẫn |
| `instructorStatus` | `InstructorStatus` | Trạng thái GVHD phản hồi |
| `facultyStatus` | `FacultyStatus` | Trạng thái khoa duyệt |
| `facultyReviewerId` | `String?` | Người duyệt cấp khoa |

Quan hệ chính:

- Thuộc `User` và `CallRound`.
- Có thể được phân công cho hội đồng qua `ProjectCouncilAssignment`.

### 6.2. `ProjectType`

Loại đề tài.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `name` | `String @unique` | Tên loại đề tài |
| `budgetCap` | `Decimal?` | Trần kinh phí |

### 6.3. `Project`

Đề tài đã được đưa vào quản lý thực hiện.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `code` | `String? @unique` | Mã đề tài |
| `title` | `String` | Tên đề tài |
| `objective` | `String` | Mục tiêu |
| `expectedOutput` | `String?` | Sản phẩm dự kiến |
| `proposalFileUrl` | `String?` | File thuyết minh |
| `budgetRequested`, `budgetApproved` | `Decimal?` | Kinh phí đề xuất/duyệt |
| `status` | `ProjectStatus` | Trạng thái đề tài |
| `leaderId` | `String` | Chủ nhiệm/trưởng nhóm |
| `instructorId` | `String?` | Giảng viên hướng dẫn |
| `deanReviewerId` | `String?` | Người duyệt khoa |
| `callRoundId` | `String?` | Đợt đăng ký |
| `projectTypeId` | `String?` | Loại đề tài |

Quan hệ chính:

- Có nhiều `ProgressReport`.
- Có nhiều `CouncilEvaluation`.
- Có nhiều `FundingDisbursement`.
- Có nhiều `ExtensionRequest`.
- Có một `ProjectClosingSubmission`.
- Có nhiều `OfficeMeeting`.

---

## 7. Báo cáo tiến độ, gia hạn, nghiệm thu

### 7.1. `ProgressReportTemplate` và `ProgressReportTemplateItem`

Mẫu báo cáo tiến độ và các mục theo tuần/giai đoạn.

| Bảng | Ý nghĩa |
|---|---|
| `ProgressReportTemplate` | Mẫu báo cáo áp dụng cho đợt đăng ký |
| `ProgressReportTemplateItem` | Các mục chi tiết của mẫu, có `weekNumber`, `taskDescription`, `expectedResult` |

Ràng buộc chính:

- `ProgressReportTemplateItem`: `@@unique([templateId, weekNumber])`.

### 7.2. `ProgressReport`

Báo cáo tiến độ của đề tài.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `projectId` | `String` | FK tới `Project` |
| `week` | `Int?` | Tuần báo cáo |
| `fromDate`, `toDate` | `DateTime?` | Khoảng thời gian |
| `tasks`, `performedContent`, `results` | `String?` | Nội dung thực hiện |
| `summary` | `String` | Tóm tắt |
| `fileUrl` | `String?` | File báo cáo |
| `mentorReview`, `mentorScore` | `String?`, `Float?` | Nhận xét/điểm GVHD |

### 7.3. `ExtensionRequest`

Yêu cầu gia hạn đề tài.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `projectId` | `String` | FK tới `Project` |
| `requestedMonths` | `Int` | Số tháng xin gia hạn |
| `reason` | `String` | Lý do |
| `status` | `RequestStatus` | Trạng thái duyệt |

### 7.4. `ProjectClosingSubmission`

Hồ sơ nghiệm thu/kết thúc đề tài.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `projectId` | `String @unique` | FK tới `Project` |
| `submittedById` | `String` | Người nộp |
| `status` | `ProjectClosingStatus` | Trạng thái nghiệm thu |
| `reportFiles` | `Json?` | File báo cáo |
| `researchSourceCodeFiles` | `Json?` | Mã nguồn/sản phẩm |
| `presentationSlideFiles`, `presentationVideoFiles` | `Json?` | File thuyết trình/video |

---

## 8. Hội đồng và đánh giá

### 8.1. `Council`

Hội đồng đánh giá trong một đợt đăng ký.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `callRoundId` | `String` | FK tới `CallRound` |
| `name` | `String` | Tên hội đồng |
| `defenseDate` | `DateTime?` | Ngày bảo vệ |
| `defenseLocation` | `String?` | Địa điểm bảo vệ |

Quan hệ chính:

- Có nhiều thành viên qua `CouncilMemberAssignment`.
- Có nhiều đề tài qua `ProjectCouncilAssignment`.

### 8.2. `CouncilMemberAssignment`

Phân công thành viên vào hội đồng.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `councilId` | `String` | FK tới `Council` |
| `councilMemberId` | `String` | FK tới `User` |
| `role` | `String?` | Vai trò trong hội đồng |

Ràng buộc: `@@unique([councilId, councilMemberId])`.

### 8.3. `ProjectCouncilAssignment`

Phân công đề tài đăng ký cho hội đồng.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `councilId` | `String` | FK tới `Council` |
| `projectRegistrationId` | `String` | FK tới `ProjectRegistration` |

Ràng buộc: `@@unique([projectRegistrationId])` — mỗi đề tài chỉ thuộc một hội đồng.

### 8.4. `CouncilEvaluation`

Đánh giá đề tài của thành viên hội đồng.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `projectId` | `String` | FK tới `Project` |
| `councilMemberId` | `String` | FK tới `User` |
| `score` | `Float` | Điểm đánh giá |
| `decision` | `ReviewDecision` | Kết luận |
| `comment` | `String?` | Nhận xét |

---

## 9. Giải ngân kinh phí

### 9.1. `FundingDisbursement`

Thông tin giải ngân kinh phí cho đề tài.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `projectId` | `String` | FK tới `Project` |
| `amount` | `Decimal` | Số tiền giải ngân |
| `disbursedAt` | `DateTime` | Ngày dự kiến/thực hiện giải ngân |
| `voucherNo` | `String?` | Số chứng từ |
| `voucherFileUrl` | `String?` | File chứng từ |
| `reason` | `String?` | Lý do giải ngân |
| `status` | `DisbursementStatus` | Trạng thái |
| `createdById` | `String` | Người tạo yêu cầu |
| `approvedById` | `String?` | Người phê duyệt |
| `paidById` | `String?` | Người chi trả |
| `paymentVoucherUrl` | `String?` | Chứng từ thanh toán |

Chỉ mục chính:

- `projectId`
- `status`
- `createdById`, `approvedById`, `paidById`

---

## 10. Thông báo, bài đăng, phòng họp

### 10.1. `Notification`

Thông báo gửi tới người dùng.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `userId` | `String` | Người nhận |
| `type` | `NotificationType` | Loại thông báo |
| `title` | `String` | Tiêu đề |
| `message` | `String` | Nội dung |
| `link` | `String?` | Link điều hướng |
| `isRead` | `Boolean` | Đã đọc/chưa đọc |
| `metadata` | `Json?` | Dữ liệu phụ |

### 10.2. `Post`

Bài đăng/thông báo công khai trong hệ thống.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `title` | `String` | Tiêu đề |
| `content` | `String` | Nội dung |
| `audience` | `PostAudience` | Đối tượng nhận |
| `status` | `PostStatus` | Trạng thái duyệt |
| `authorId` | `String` | Người viết |
| `approvedById` | `String?` | Người duyệt |
| `departmentId` | `String?` | Khoa liên quan |

### 10.3. `Room`

Phòng họp/phòng bảo vệ.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | `String` | Tên phòng |
| `code` | `String` | Mã phòng |
| `capacity` | `Int?` | Sức chứa |
| `departmentId` | `String` | FK tới `Department` |
| `isActive` | `Boolean` | Trạng thái hoạt động |

Ràng buộc: `@@unique([code, departmentId])`.

### 10.4. `OfficeMeeting` và `OfficeMeetingView`

Lịch họp giữa giảng viên hướng dẫn và nhóm đề tài.

| Bảng | Ý nghĩa |
|---|---|
| `OfficeMeeting` | Thông tin buổi họp: đề tài, GVHD, thời gian, địa điểm/phòng |
| `OfficeMeetingView` | Trạng thái đọc lịch họp của từng người dùng |

---

## 11. Tác vụ AI và báo cáo chạy nền

### 11.1. `AutoApprovalJob`

Job phê duyệt/đánh giá tự động bằng OCR + LLM.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `deanId` | `String` | Trưởng khoa tạo job |
| `filters` | `Json` | Điều kiện lọc đề tài |
| `criteria` | `Json` | Tiêu chí đánh giá |
| `status` | `AutoApprovalJobStatus` | Trạng thái job |
| `progress` | `Int` | Tiến độ 0-100 |
| `results` | `Json?` | Kết quả LLM |
| `error` | `String?` | Lỗi nếu có |
| `completedAt` | `DateTime?` | Thời điểm hoàn thành |

### 11.2. `ReportTemplate`

Template báo cáo do người dùng upload.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | `String` | Tên template |
| `fileUrl` | `String` | URL file |
| `fileType` | `String` | Loại file |
| `fileSize` | `Int` | Kích thước |
| `uploadedBy` | `String` | Người upload |

### 11.3. `ReportJob`

Job sinh báo cáo bằng RabbitMQ + LLM.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `String` | Khóa chính |
| `deanId` | `String` | Người tạo job |
| `reportType` | `String` | Loại báo cáo |
| `templateId` | `String?` | FK tới `ReportTemplate` |
| `callRoundId` | `String?` | Đợt đăng ký liên quan |
| `parameters` | `Json` | Tham số sinh báo cáo |
| `status` | `ReportJobStatus` | Trạng thái job |
| `progress` | `Int` | Tiến độ 0-100 |
| `resultUrl` | `String?` | URL file báo cáo kết quả |
| `error` | `String?` | Lỗi nếu có |

---

## 12. Quan hệ tổng quát

```text
Department
   └── Major
        └── Class
             └── User

User
   ├── ProjectRegistration
   ├── Project
   ├── Notification
   ├── CouncilEvaluation
   └── Lecturer

CallRound
   ├── ProjectRegistration
   ├── Project
   ├── Council
   ├── CallRoundInstructor
   ├── CallRoundCouncilMember
   └── CallRoundAttachment

ProjectRegistration
   └── ProjectCouncilAssignment
        └── Council

Project
   ├── ProgressReport
   ├── CouncilEvaluation
   ├── FundingDisbursement
   ├── ExtensionRequest
   └── ProjectClosingSubmission

RabbitMQ Jobs
   ├── AutoApprovalJob
   └── ReportJob
```

---

## 13. Các bảng chính nên ưu tiên khi mô tả hệ thống

| Nhóm | Bảng chính |
|---|---|
| Tổ chức | `Department`, `Major`, `Class` |
| Người dùng | `User`, `Lecturer`, `LecturerPublication` |
| Đợt đăng ký | `CallRound`, `CallRoundAttachment`, `CallRoundInstructor`, `CallRoundCouncilMember` |
| Đề tài | `ProjectRegistration`, `Project`, `ProjectType` |
| Báo cáo/nghiệm thu | `ProgressReport`, `ProgressReportTemplate`, `ProjectClosingSubmission`, `ExtensionRequest` |
| Hội đồng | `Council`, `CouncilMemberAssignment`, `ProjectCouncilAssignment`, `CouncilEvaluation` |
| Tài chính | `FundingDisbursement` |
| Truyền thông | `Notification`, `Post`, `OfficeMeeting`, `Room` |
| AI/Queue | `AutoApprovalJob`, `ReportTemplate`, `ReportJob` |

---

## 14. Kết luận

Schema Prisma của URMS được thiết kế theo mô hình quan hệ, lấy `User`, `CallRound`, `ProjectRegistration`, `Project`, `Council` và `FundingDisbursement` làm các bảng nghiệp vụ trung tâm.

Các bảng `AutoApprovalJob` và `ReportJob` bổ sung lớp xử lý nền cho tác vụ AI tốn thời gian như OCR, đánh giá bằng LLM và sinh báo cáo qua RabbitMQ.