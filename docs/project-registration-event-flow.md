# LUỒNG SỰ KIỆN ĐĂNG KÝ ĐỀ TÀI

## 1. Mục tiêu tài liệu

Tài liệu mô tả luồng sự kiện đăng ký đề tài nghiên cứu trong hệ thống URMS, từ lúc sinh viên truy cập chức năng đăng ký đến khi đề tài được giảng viên hướng dẫn phản hồi và trưởng khoa duyệt.

Nguồn tham chiếu chính:

- `uml/uc/student/use-case-dang-ky-de-tai-moi.md`
- `app/api/my-project-registrations/route.ts`
- `app/api/my-project-registrations/[id]/route.ts`
- `app/api/my-project-registrations/[id]/instructor-status/route.ts`
- `app/api/dean/approvals/[id]/route.ts`
- `prisma/schema.prisma`

---

## 2. Tác nhân tham gia

| Tác nhân | Vai trò | Hành động chính |
|---|---|---|
| Sinh viên | `STUDENT` | Tạo, xem, sửa, hủy đăng ký đề tài |
| Giảng viên | `LECTURER` | Chấp nhận hoặc từ chối hướng dẫn |
| Trưởng khoa | `DEAN` | Duyệt hoặc từ chối đề tài cấp khoa |
| Hệ thống | Backend/API | Kiểm tra điều kiện, lưu dữ liệu, gửi thông báo, tạo đề tài chính thức |

---

## 3. Dữ liệu liên quan

### 3.1. Bảng chính

| Bảng | Vai trò trong luồng |
|---|---|
| `ProjectRegistration` | Lưu hồ sơ đăng ký đề tài ban đầu |
| `CallRound` | Xác định đợt đăng ký đang mở |
| `User` | Sinh viên, giảng viên, trưởng khoa |
| `Project` | Đề tài chính thức sau khi được trưởng khoa duyệt |
| `Notification` | Thông báo cho thành viên nhóm, giảng viên, người liên quan |

### 3.2. Trạng thái chính

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `ProjectRegistration.status` | `PENDING` | Đăng ký đang chờ xử lý |
| `ProjectRegistration.status` | `APPROVED` | Đăng ký đã được khoa duyệt |
| `ProjectRegistration.status` | `REJECTED` | Đăng ký bị từ chối |
| `ProjectRegistration.status` | `CANCELED` | Sinh viên đã hủy đăng ký |
| `instructorStatus` | `PENDING` | Giảng viên chưa phản hồi |
| `instructorStatus` | `ACCEPTED` | Giảng viên đồng ý hướng dẫn |
| `instructorStatus` | `REJECTED` | Giảng viên từ chối hướng dẫn |
| `facultyStatus` | `PENDING` | Khoa chưa duyệt |
| `facultyStatus` | `APPROVED` | Khoa đã duyệt |
| `facultyStatus` | `REJECTED` | Khoa từ chối |

---

## 4. Tiền điều kiện

Trước khi sinh viên gửi đăng ký, hệ thống yêu cầu:

1. Người dùng đã đăng nhập.
2. Vai trò hợp lệ: `STUDENT` hoặc `LECTURER` theo API hiện tại.
3. Có đợt đăng ký phù hợp:
   - `isActive = true`
   - `isLocked = false`
   - `approvalStatus = APPROVED`
   - `applicableFor` phù hợp với vai trò: `STUDENT`, `LECTURER` hoặc `BOTH`
   - Ngày hiện tại nằm trong khoảng `registrationStartDate` đến `registrationEndDate`
4. Người đăng ký thuộc đúng khoa/ngành/lớp nếu đợt đăng ký có giới hạn `departments`, `majors`, `classes`.
5. Người đăng ký chưa có đề tài đang chờ duyệt hoặc đã được duyệt trong cùng đợt.
6. Người đăng ký chưa là thành viên đã chấp nhận tham gia nhóm đề tài khác trong cùng đợt.
7. Giảng viên hướng dẫn được chọn đã chấp nhận lời mời tham gia đợt đăng ký.

---

## 5. Luồng sự kiện tổng quát

```text
[Sinh viên đăng nhập]
        ↓
[Truy cập /student/projects]
        ↓
[Hệ thống tải đợt đăng ký đang mở]
        ↓
[Sinh viên nhập thông tin đề tài]
        ↓
[Sinh viên chọn thành viên nhóm và giảng viên hướng dẫn]
        ↓
[Gửi đăng ký]
        ↓
[Backend kiểm tra điều kiện]
        ↓
[Tạo ProjectRegistration]
        ↓
[Gửi thông báo cho thành viên nhóm]
        ↓
[Giảng viên phản hồi hướng dẫn]
        ↓
[Trưởng khoa duyệt cấp khoa]
        ↓
[Nếu APPROVED: tạo Project chính thức]
```

---

## 6. Luồng 1: Sinh viên tạo đăng ký đề tài

### 6.1. Giao diện

1. Sinh viên truy cập `/student/projects`.
2. Hệ thống hiển thị đợt đăng ký đang mở.
3. Nếu có nhiều đợt, sinh viên chọn một đợt từ dropdown.
4. Sinh viên nhập:
   - Tên đề tài.
   - Mục tiêu.
   - Sản phẩm dự kiến.
   - File thuyết minh nếu có.
5. Sinh viên thêm thành viên nhóm:
   - Chọn sinh viên cùng khoa.
   - Lọc theo ngành/lớp.
   - Tối đa 5 thành viên theo rule use case.
6. Sinh viên chọn giảng viên hướng dẫn.
7. Sinh viên bấm **Gửi đăng ký**.

### 6.2. API xử lý

Endpoint:

```http
POST /api/my-project-registrations
```

Backend xử lý theo thứ tự:

1. Lấy `actorUserId` và `actorRole` từ request.
2. Nếu chưa đăng nhập, trả `401 Unauthorized`.
3. Nếu role không được phép, trả `403`.
4. Tìm danh sách `CallRound` đang mở và phù hợp.
5. Nếu không có đợt phù hợp, trả lỗi:

```text
Hiện tại chưa có đợt đăng ký phù hợp (đã duyệt, đúng đối tượng và chưa bị khóa) đang mở.
```

6. Nếu client truyền `callRoundId`, hệ thống kiểm tra ID đó có thuộc danh sách đợt đang mở không.
7. Kiểm tra đợt có bị khóa không.
8. Lấy thông tin tổ chức của người dùng: `departmentId`, `majorId`, `classId`.
9. Kiểm tra người dùng có thuộc đúng khoa/ngành/lớp được phép không.
10. Kiểm tra người dùng chưa có đăng ký khác trong cùng đợt với điều kiện:
    - `status = APPROVED`, hoặc
    - `facultyStatus = APPROVED`, hoặc
    - `status = PENDING` và `instructorStatus != REJECTED`.
11. Kiểm tra người dùng chưa là thành viên đã `ACCEPTED` trong đề tài khác cùng đợt.
12. Validate payload bằng `createProjectRegistrationSchema`.
13. Kiểm tra giảng viên được chọn có trong `availableInstructors` và `invitationStatus = ACCEPTED`.
14. Chuẩn hóa danh sách thành viên nhóm:
    - Thành viên có `studentId` được gán `invitationStatus = PENDING`.
    - Gán `invitedAt` bằng thời điểm hiện tại.
    - Gán `respondedAt = null`.
15. Tạo bản ghi `ProjectRegistration`.
16. Gửi thông báo cho các thành viên được mời.
17. Trả kết quả `201 Created`.

### 6.3. Dữ liệu được tạo

```ts
ProjectRegistration {
  userId: actorUserId,
  title,
  objective,
  expectedOutput,
  proposalFiles,
  teamMembers,
  instructorId,
  callRoundId,
  status: "PENDING",
  instructorStatus: "PENDING",
  facultyStatus: "PENDING"
}
```

---

## 7. Luồng 2: Xem lịch sử đăng ký

Endpoint:

```http
GET /api/my-project-registrations
```

Backend trả danh sách đăng ký mà người dùng là:

1. Chủ đăng ký: `userId = actorUserId`.
2. Thành viên nhóm: `teamMembers` có phần tử chứa `studentId = actorUserId`.

Dữ liệu include:

- Giảng viên hướng dẫn: `instructor.id`, `instructor.name`.
- Đợt đăng ký: `callRound.id`, `callRound.name`, `registrationStartDate`, `registrationEndDate`, `projectStartDate`, `projectEndDate`.

Giao diện cho phép:

- Xem danh sách lịch sử.
- Lọc theo đợt.
- Lọc theo trạng thái.
- Tìm kiếm.
- Xem chi tiết đề tài.

---

## 8. Luồng 3: Sinh viên sửa đăng ký

Endpoint:

```http
PATCH /api/my-project-registrations/[id]
```

Điều kiện sửa:

1. Người dùng đã đăng nhập.
2. Người dùng là chủ đăng ký: `registration.userId = actorUserId`.
3. `registration.status = PENDING`.
4. `registration.instructorStatus = PENDING`.
5. `registration.facultyStatus = PENDING`.

Nếu không thỏa, API trả lỗi:

```text
Chỉ được sửa khi cả trạng thái giảng viên và duyệt khoa đều là PENDING.
```

Dữ liệu được phép cập nhật:

- `title`
- `objective`
- `expectedOutput`
- `proposalFiles`
- `teamMembers`

Không cập nhật trong luồng sửa:

- `instructorId`
- `callRoundId`

Khi thêm thành viên mới có `studentId`, hệ thống gửi notification mời tham gia nhóm.

---

## 9. Luồng 4: Sinh viên hủy đăng ký

Endpoint:

```http
PATCH /api/my-project-registrations/[id]
```

Payload có `cancelReason` sẽ được xử lý như yêu cầu hủy.

Điều kiện hủy:

1. Người dùng đã đăng nhập.
2. Người dùng là chủ đăng ký.
3. `registration.status = PENDING`.
4. Có lý do hủy hợp lệ theo `cancelProjectRegistrationSchema`.

Dữ liệu cập nhật:

```ts
{
  status: "CANCELED",
  cancelReason
}
```

Sau khi hủy, đăng ký không còn được tính là đăng ký đang hoạt động trong đợt.

---

## 10. Luồng 5: Giảng viên phản hồi hướng dẫn

Endpoint:

```http
PATCH /api/my-project-registrations/[id]/instructor-status
```

Payload:

```json
{
  "status": "ACCEPTED"
}
```

hoặc:

```json
{
  "status": "REJECTED"
}
```

Điều kiện:

1. Người dùng đã đăng nhập.
2. Người dùng chính là giảng viên được gán trong `ProjectRegistration.instructorId`.
3. Status chỉ được là `ACCEPTED` hoặc `REJECTED`.

Kết quả:

| Giảng viên chọn | Cập nhật dữ liệu |
|---|---|
| `ACCEPTED` | `instructorStatus = ACCEPTED` |
| `REJECTED` | `instructorStatus = REJECTED`, `status = REJECTED` |

Ý nghĩa:

- Nếu giảng viên đồng ý, hồ sơ chuyển sang bước chờ trưởng khoa duyệt.
- Nếu giảng viên từ chối, đăng ký bị từ chối và sinh viên có thể đăng ký đề tài khác nếu còn đợt mở.

---

## 11. Luồng 6: Trưởng khoa duyệt cấp khoa

Endpoint:

```http
PATCH /api/dean/approvals/[id]
```

Payload:

```json
{
  "status": "APPROVED"
}
```

hoặc:

```json
{
  "status": "REJECTED"
}
```

hoặc hoàn tác về chờ duyệt:

```json
{
  "status": "PENDING"
}
```

Điều kiện:

1. Người dùng đã đăng nhập.
2. Người dùng có role `DEAN`.
3. Đăng ký tồn tại.
4. Đăng ký chưa bị hủy.
5. Nếu duyệt `APPROVED`, bắt buộc `instructorStatus = ACCEPTED`.
6. Nếu có `projectLockDate`, ngày hiện tại không được vượt quá ngày chốt đề tài.

Khi trưởng khoa duyệt:

```ts
{
  facultyStatus: status,
  status,
  facultyReviewerId: deanId
}
```

Nếu status là `APPROVED`, hệ thống kiểm tra đề tài chính thức đã tồn tại chưa. Nếu chưa có, tạo `Project` mới:

```ts
Project {
  title: registration.title,
  objective: registration.objective,
  expectedOutput: registration.expectedOutput,
  proposalFileUrl: firstUploadedProposalFileUrl,
  status: ProjectStatus.IN_PROGRESS,
  leaderId: registration.userId,
  instructorId: registration.instructorId,
  deanReviewerId: deanId,
  callRoundId: registration.callRoundId
}
```

---

## 12. Sơ đồ trạng thái đăng ký

```text
Tạo đăng ký
    ↓
ProjectRegistration.status = PENDING
instructorStatus = PENDING
facultyStatus = PENDING
    ↓
Giảng viên phản hồi
    ├── REJECTED
    │       ↓
    │   instructorStatus = REJECTED
    │   status = REJECTED
    │
    └── ACCEPTED
            ↓
        instructorStatus = ACCEPTED
            ↓
        Trưởng khoa duyệt
            ├── REJECTED
            │       ↓
            │   facultyStatus = REJECTED
            │   status = REJECTED
            │
            └── APPROVED
                    ↓
                facultyStatus = APPROVED
                status = APPROVED
                    ↓
                Tạo Project.status = IN_PROGRESS

Sinh viên có thể hủy khi status = PENDING:
    ↓
status = CANCELED
```

---

## 13. Luồng lỗi và rẽ nhánh

| Mã | Tình huống | Kết quả |
|---|---|---|
| A1 | Không có đợt đăng ký mở | Form bị vô hiệu hóa, API trả lỗi 400 |
| A2 | Đợt đăng ký bị khóa | Không cho tạo đăng ký mới |
| A3 | Người dùng không thuộc khoa/ngành/lớp được phép | API trả 403 |
| A4 | Đã có đề tài trong đợt | API trả 400 |
| A5 | Đã tham gia nhóm khác với trạng thái `ACCEPTED` | API trả 400 |
| A6 | Giảng viên chưa `ACCEPTED` lời mời tham gia đợt | API trả 400 |
| A7 | Payload không hợp lệ | API trả 400 và danh sách lỗi field |
| A8 | Sửa sau khi giảng viên/khoa đã phản hồi | API trả 409 |
| A9 | Hủy đăng ký không ở trạng thái `PENDING` | API trả 409 |
| A10 | Trưởng khoa duyệt khi giảng viên chưa đồng ý | API trả 409 |
| A11 | Quá hạn `projectLockDate` | API trả 409 |

---

## 14. Quy tắc nghiệp vụ chính

1. Mỗi người dùng chỉ có một đăng ký đang hoạt động trong một đợt.
2. Đăng ký bị `CANCELED` hoặc bị giảng viên `REJECTED` có thể không chặn đăng ký mới.
3. Thành viên nhóm có `studentId` phải xác nhận lời mời trước khi được xem là đã tham gia.
4. Giảng viên hướng dẫn phải thuộc danh sách `availableInstructors` của đợt và đã `ACCEPTED` lời mời.
5. Sinh viên chỉ được sửa đăng ký khi chưa có bất kỳ phản hồi duyệt nào.
6. Sinh viên chỉ được hủy đăng ký khi `status = PENDING`.
7. Trưởng khoa chỉ duyệt `APPROVED` sau khi giảng viên đã `ACCEPTED`.
8. Khi trưởng khoa duyệt `APPROVED`, hệ thống tạo bản ghi `Project` chính thức với trạng thái `IN_PROGRESS`.

---

## 15. Endpoint liên quan

| Mục đích | Method | Endpoint |
|---|---|---|
| Xem lịch sử đăng ký | `GET` | `/api/my-project-registrations` |
| Tạo đăng ký | `POST` | `/api/my-project-registrations` |
| Sửa đăng ký | `PATCH` | `/api/my-project-registrations/[id]` |
| Hủy đăng ký | `PATCH` | `/api/my-project-registrations/[id]` |
| Giảng viên phản hồi | `PATCH` | `/api/my-project-registrations/[id]/instructor-status` |
| Trưởng khoa duyệt | `PATCH` | `/api/dean/approvals/[id]` |

---

## 16. Kết luận

Luồng đăng ký đề tài trong URMS đi qua ba lớp kiểm soát chính:

1. **Sinh viên tạo hồ sơ đăng ký** trong đợt đăng ký hợp lệ.
2. **Giảng viên hướng dẫn xác nhận** đồng ý hoặc từ chối hướng dẫn.
3. **Trưởng khoa duyệt cấp khoa** và tạo đề tài chính thức nếu hồ sơ được chấp thuận.

Thiết kế này giúp hệ thống kiểm soát trùng đăng ký, giới hạn theo đợt, kiểm tra điều kiện tổ chức và đảm bảo đề tài chỉ được đưa vào thực hiện sau khi đã qua đủ bước xác nhận.