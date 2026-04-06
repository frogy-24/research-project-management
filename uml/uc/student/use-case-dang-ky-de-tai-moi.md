# MÔ TẢ USE CASE: ĐĂNG KÝ ĐỀ TÀI MỚI

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Đăng ký đề tài nghiên cứu mới |
| 2 | **Tác nhân** | Sinh viên (Student) |
| 3 | **Mô tả** | Use-case cho phép sinh viên đăng ký đề tài nghiên cứu mới trong đợt đăng ký đang mở. Sinh viên nhập thông tin đề tài (tên, mục tiêu, sản phẩm dự kiến), chọn giảng viên hướng dẫn, thêm thành viên nhóm (tối đa 5 người). Hệ thống kiểm tra điều kiện (chưa có đăng ký trong đợt, chưa tham gia nhóm khác), validate dữ liệu và tạo ProjectRegistration với trạng thái PENDING. Sinh viên có thể xem lịch sử đăng ký, chỉnh sửa (nếu chưa duyệt), hủy đăng ký với lý do. Hệ thống hỗ trợ tìm kiếm sinh viên cùng khoa để thêm vào nhóm, lọc theo ngành/lớp |
| 4 | **Tiền điều kiện** | 1. Sinh viên đã đăng nhập (role = STUDENT)<br>2. Có ít nhất 1 đợt đăng ký đang mở (isActive = true, approvalStatus = APPROVED, applicableFor = STUDENT/BOTH)<br>3. Thời gian hiện tại trong khoảng registrationStartDate - registrationEndDate<br>4. Sinh viên chưa có đăng ký nào trong đợt (status != CANCELED và instructorStatus != REJECTED)<br>5. Sinh viên chưa xác nhận tham gia nhóm khác trong đợt (invitationStatus != ACCEPTED) |
| 5 | **Hậu điều kiện** | **Sau khi đăng ký thành công:**<br>1. Tạo ProjectRegistration mới với status = PENDING<br>2. instructorStatus = PENDING, facultyStatus = PENDING<br>3. Lưu thông tin: title, objective, expectedOutput, teamMembers (JSON)<br>4. Gán instructorId, callRoundId, leaderId = userId<br>5. Gửi thông báo cho giảng viên được chọn<br>6. Gửi lời mời (TeamInvitation) cho các thành viên có studentId<br>7. Reset form đăng ký<br>8. Toast success: "Đăng ký đề tài thành công"<br><br>**Sau khi chỉnh sửa:**<br>1. Cập nhật title, objective, expectedOutput, teamMembers<br>2. Không thay đổi instructorId, callRoundId<br>3. Toast success: "Cập nhật đề tài thành công"<br><br>**Sau khi hủy:**<br>1. Cập nhật status = CANCELED<br>2. Lưu cancelReason<br>3. Toast success: "Đã hủy đăng ký đề tài" |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: ĐĂNG KÝ ĐỀ TÀI MỚI**<br>1. Sinh viên truy cập /student/projects<br>2. Hệ thống load danh sách đợt đăng ký đang mở<br>3. Hiển thị Alert thông tin đợt (tên, thời gian, template)<br>4. Nếu có nhiều đợt: Hiển thị dropdown chọn đợt<br>5. Sinh viên nhập tên đề tài (bắt buộc)<br>6. Sinh viên nhập mục tiêu (bắt buộc, textarea)<br>7. Sinh viên nhập sản phẩm dự kiến (tùy chọn)<br>8. Sinh viên click "Thêm thành viên" -> Mở dialog<br>9. Chọn ngành/lớp để lọc, tìm kiếm sinh viên<br>10. Click chọn sinh viên -> Thêm vào danh sách (tối đa 5)<br>11. Sinh viên chọn giảng viên hướng dẫn (dropdown)<br>12. Click "Gửi đăng ký"<br>13. Validate: Tên đề tài, mục tiêu, giảng viên không rỗng<br>14. POST /api/my-project-registrations<br>15. Backend tạo ProjectRegistration, gửi thông báo<br>16. Toast success, reset form<br><br>**LUỒNG 2: XEM LỊCH SỬ**<br>1. Hiển thị Table lịch sử đăng ký<br>2. Lọc theo đợt, trạng thái, tìm kiếm<br>3. Click tên đề tài -> Mở dialog chi tiết<br>4. Hiển thị đầy đủ thông tin, thành viên, trạng thái duyệt<br><br>**LUỒNG 3: CHỈNH SỬA**<br>1. Click "Sửa" (chỉ khi status=PENDING, chưa duyệt)<br>2. Mở dialog, load dữ liệu hiện tại<br>3. Sửa title, objective, expectedOutput, teamMembers<br>4. Click "Cập nhật" -> PATCH /api/my-project-registrations/[id]<br>5. Toast success, đóng dialog<br><br>**LUỒNG 4: HỦY ĐĂNG KÝ**<br>1. Nhập lý do hủy (textarea, bắt buộc)<br>2. Click "Hủy đăng ký"<br>3. POST /api/my-project-registrations/[id]/cancel<br>4. Toast success, cập nhật trạng thái |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Chưa mở đợt đăng ký**<br>- Alert destructive: "Chưa mở đợt đăng ký"<br>- Disable toàn bộ form<br><br>**A2. Đã có đăng ký trong đợt**<br>- Alert amber: "Đã có đăng ký"<br>- Disable form, chỉ xem lịch sử<br><br>**A3. Đã tham gia nhóm khác**<br>- Alert amber: "Đã tham gia nhóm đề tài"<br>- Disable form<br><br>**A4. Có nhiều đợt đang mở**<br>- Hiển thị dropdown chọn đợt<br>- Alert liệt kê tất cả đợt<br><br>**A5. Đợt có danh sách giảng viên chỉ định**<br>- Chỉ hiển thị availableInstructors<br>- Text: "Chỉ hiển thị X giảng viên được chỉ định"<br><br>**A6. Không có thành viên nhóm**<br>- Text: "Bấm Thêm thành viên để chọn"<br>- Vẫn cho phép đăng ký (nhóm 1 người)<br><br>**A7. Lịch sử trống**<br>- Empty state: Icon MonitorX<br>- "Chưa có đề tài nào được đăng ký"<br><br>**A8. Không tìm thấy kết quả lọc**<br>- "Không tìm thấy đề xuất phù hợp bộ lọc" |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Validation lỗi**<br>- Toast error: "Vui lòng nhập tên đề tài/mục tiêu/chọn giảng viên"<br><br>**E2. Thành viên không đầy đủ**<br>- Toast error: "Vui lòng nhập đầy đủ tên và vai trò"<br><br>**E3. Quá 5 thành viên**<br>- Toast error: "Tối đa 5 thành viên nhóm"<br>- Disable nút "Thêm thành viên"<br><br>**E4. Trùng thành viên**<br>- Toast error: "Sinh viên này đã có trong nhóm"<br><br>**E5. Không xác định được khoa**<br>- Toast error: "Không xác định được khoa của bạn"<br>- Không mở dialog chọn thành viên<br><br>**E6. Lỗi API**<br>- Toast error với message từ server<br>- Form không reset<br><br>**E7. Không thể chỉnh sửa**<br>- Chỉ cho phép sửa khi: status=PENDING, instructorStatus=PENDING, facultyStatus=PENDING<br>- Nếu không: Ẩn nút "Sửa"<br><br>**E8. Thiếu lý do hủy**<br>- Toast error: "Vui lòng nhập lý do hủy"<br><br>**E9. Network error**<br>- React Query auto retry 3 lần<br>- Toast error: "Kết nối bị gián đoạn" |

## Sơ đồ Use Case

Xem file: `uml/uc/student/project-registration-usecase.plantuml`

## Các bảng liên quan trong Database

1. **ProjectRegistration** - Đăng ký đề tài
   - id, title, objective, expectedOutput
   - leaderId (sinh viên tạo), instructorId, callRoundId
   - status (PENDING/APPROVED/CANCELED/REJECTED)
   - instructorStatus, facultyStatus
   - teamMembers (JSON), cancelReason
   - createdAt, updatedAt

2. **CallRound** - Đợt đăng ký
   - id, name, isActive, approvalStatus
   - applicableFor (STUDENT/LECTURER/BOTH)
   - registrationStartDate, registrationEndDate
   - templateId, availableInstructors

3. **User** - Người dùng
   - id, name, email, code, role
   - departmentId, majorId, classId

4. **TeamInvitation** - Lời mời nhóm
   - id, registrationId, invitedUserId
   - invitationStatus (PENDING/ACCEPTED/REJECTED)
   - invitedAt, respondedAt

5. **Major** - Ngành học
6. **Class** - Lớp học

## Quy tắc nghiệp vụ

1. Mỗi sinh viên chỉ đăng ký 1 đề tài/đợt (trừ khi hủy hoặc bị từ chối)
2. Sinh viên đã xác nhận tham gia nhóm khác không thể đăng ký mới
3. Tối đa 5 thành viên nhóm (bao gồm trưởng nhóm)
4. Chỉ chọn sinh viên cùng khoa để thêm vào nhóm
5. Chỉ chỉnh sửa khi chưa có bất kỳ duyệt nào (tất cả PENDING)
6. Hủy đăng ký bắt buộc phải có lý do
7. Nếu đợt có availableInstructors, chỉ chọn trong danh sách đó
8. Thành viên có thể nhập tay (không có studentId) hoặc chọn từ hệ thống

## Ghi chú kỹ thuật

- **API**: POST /api/my-project-registrations, PATCH /api/my-project-registrations/[id], POST /api/my-project-registrations/[id]/cancel
- **Hooks**: useMyProjectRegistrations, useCreateMyProjectRegistration, useUpdateMyProjectRegistration, useCancelMyProjectRegistration
- **Component**: ProjectRegistrationPage (components/portal/project-registration-page.tsx)
- **Validation**: Client-side (React state) + Server-side (Zod schema)
- **Real-time**: React Query auto refetch sau mutation
- **Search**: Client-side filtering với debounce 300ms

## Workflow tổng thể

```
[Sinh viên đăng nhập] → [Truy cập /student/projects]
    ↓
[Kiểm tra đợt đăng ký]
    ├─→ Chưa mở: Hiển thị Alert, disable form
    ├─→ Đã có đăng ký: Disable form
    └─→ OK: Hiển thị form đăng ký
    ↓
[Nhập thông tin đề tài]
    ├─→ Tên đề tài (bắt buộc)
    ├─→ Mục tiêu (bắt buộc)
    ├─→ Sản phẩm dự kiến (tùy chọn)
    ├─→ Thêm thành viên (dialog, tối đa 5)
    └─→ Chọn giảng viên (dropdown)
    ↓
[Gửi đăng ký] → [Validate] → [POST API]
    ↓
[Backend xử lý]
    ├─→ Tạo ProjectRegistration (status=PENDING)
    ├─→ Gửi thông báo cho giảng viên
    ├─→ Tạo TeamInvitation cho thành viên
    └─→ Return success
    ↓
[Frontend] → Toast success → Reset form → Refetch danh sách
    ↓
[Xem lịch sử]
    ├─→ Lọc theo đợt/trạng thái
    ├─→ Tìm kiếm
    ├─→ Xem chi tiết (dialog)
    ├─→ Sửa (nếu chưa duyệt)
    └─→ Hủy (nhập lý do)
```

## So sánh với các Use Case khác

| Tiêu chí | Đăng ký đề tài (Student) | Duyệt hướng dẫn (Lecturer) | Duyệt cấp Khoa (Dean) |
|----------|--------------------------|----------------------------|------------------------|
| **Actor** | Sinh viên | Giảng viên | Trưởng Khoa |
| **Đối tượng** | ProjectRegistration | ProjectRegistration | ProjectRegistration |
| **Hành động** | Tạo mới, Sửa, Hủy | Chấp nhận/Từ chối | Duyệt/Từ chối |
| **Điều kiện** | Đợt đang mở, chưa đăng ký | Được chọn làm instructor | Đề tài thuộc khoa |
| **Giới hạn** | 1 đề tài/đợt, tối đa 5 thành viên | Không giới hạn | Theo khoa |
| **Thông báo** | Gửi giảng viên + thành viên | Gửi sinh viên | Gửi sinh viên + GVHD |
| **Có thể sửa** | Có (khi chưa duyệt) | Không | Không |
| **Trạng thái** | status, instructorStatus, facultyStatus | instructorStatus | facultyStatus |
| **Tìm kiếm** | Có (client-side) | Có (debounce) | Có (debounce) |
| **Lọc** | Đợt, trạng thái | Đợt, trạng thái | Đợt, trạng thái |
| **Phân trang** | Không | Không | Có (10/trang) |
