# MÔ TẢ USE CASE: NỘP BÁO CÁO TIẾN ĐỘ

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Nộp báo cáo tiến độ đề tài nghiên cứu |
| 2 | **Tác nhân** | Sinh viên (Student/Leader - Trưởng nhóm) |
| 3 | **Mô tả** | Use-case cho phép sinh viên (trưởng nhóm) nộp báo cáo tiến độ tuần cho đề tài nghiên cứu đang thực hiện. Hệ thống tự động tính tuần hiện tại dựa trên số báo cáo đã nộp và thời gian bắt đầu đề tài. Sinh viên nhập 4 phần nội dung bắt buộc: công việc được giao, nội dung đã thực hiện, kết quả đạt được, và báo cáo chi tiết. Có thể upload file đính kèm (PDF/DOC/DOCX). Sau khi nộp, hệ thống gửi thông báo cho giảng viên hướng dẫn. Sinh viên có thể xem lịch sử các báo cáo đã nộp và đánh giá từ giảng viên |
| 4 | **Tiền điều kiện** | 1. Sinh viên đã đăng nhập (role = STUDENT)<br>2. Sinh viên là trưởng nhóm của đề tài (leaderId = userId)<br>3. Đề tài đã được phê duyệt (status = APPROVED hoặc IN_PROGRESS)<br>4. Đề tài có giảng viên hướng dẫn (instructorId không null)<br>5. Trong thời gian thực hiện đề tài (nếu có thiết lập) |
| 5 | **Hậu điều kiện** | **Sau khi nộp báo cáo thành công:**<br>1. Tạo ProgressReport mới với submittedAt = thời gian hiện tại<br>2. Lưu thông tin: periodLabel, summary, week, fromDate, toDate<br>3. Lưu 4 phần nội dung: tasks, performedContent, results, reportContent<br>4. Lưu fileUrl nếu có upload file<br>5. Gửi thông báo cho giảng viên hướng dẫn<br>6. Reset form nộp báo cáo<br>7. Toast success: "Nộp báo cáo thành công"<br>8. Tự động refetch danh sách báo cáo<br><br>**Sau khi xem lịch sử:**<br>1. Hiển thị tất cả báo cáo đã nộp<br>2. Sắp xếp theo tuần (mới nhất trước)<br>3. Hiển thị trạng thái đánh giá của từng báo cáo<br>4. Có thể xem chi tiết và đánh giá từ GVHD |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: NỘP BÁO CÁO TIẾN ĐỘ MỚI**<br>1. Sinh viên truy cập trang quản lý đề tài của mình<br>2. Hệ thống kiểm tra quyền trưởng nhóm<br>3. Hiển thị form nộp báo cáo tiến độ<br>4. Hệ thống tự động tính tuần hiện tại = số báo cáo đã nộp + 1<br>5. Hệ thống tự động tính fromDate = projectStartDate + (week-1) tuần<br>6. Hệ thống tự động tính toDate = projectStartDate + week tuần<br>7. Hiển thị thông tin: "Tuần {week}" và khoảng thời gian<br>8. Sinh viên nhập "Công việc được giao" (Textarea, bắt buộc)<br>9. Sinh viên nhập "Nội dung đã thực hiện" (Rich Text Editor, bắt buộc)<br>10. Sinh viên nhập "Kết quả đạt được" (Rich Text Editor, bắt buộc)<br>11. Sinh viên nhập "Nội dung báo cáo chi tiết" (Rich Text Editor, bắt buộc)<br>12. Sinh viên có thể upload file đính kèm (tùy chọn)<br>13. Click "Nộp báo cáo"<br>14. Validate: Tất cả 4 phần nội dung không rỗng, mỗi phần tối thiểu 10 ký tự<br>15. POST /api/projects/[id]/progress-reports<br>16. Backend tạo ProgressReport, gửi thông báo<br>17. Toast success, reset form<br>18. Tự động refetch danh sách báo cáo<br><br>**LUỒNG 2: XEM LỊCH SỬ BÁO CÁO**<br>1. Hiển thị Card "Danh sách báo cáo tuần"<br>2. Table với các cột: STT, Tên báo cáo, Tuần, Thời gian, Điểm, Trạng thái, Thao tác<br>3. Mỗi báo cáo hiển thị:<br>&nbsp;&nbsp;&nbsp;• periodLabel (VD: "Tuần 1")<br>&nbsp;&nbsp;&nbsp;• week (số tuần)<br>&nbsp;&nbsp;&nbsp;• fromDate - toDate<br>&nbsp;&nbsp;&nbsp;• mentorScore/10 hoặc "Chưa chấm"<br>&nbsp;&nbsp;&nbsp;• Badge "Đã đánh giá" (green) hoặc "Chưa đánh giá" (gray)<br>&nbsp;&nbsp;&nbsp;• Icon "Xem file" (nếu có fileUrl)<br>&nbsp;&nbsp;&nbsp;• Nút "Xem chi tiết"<br>4. Sắp xếp theo tuần giảm dần (mới nhất trước)<br><br>**LUỒNG 3: XEM CHI TIẾT BÁO CÁO**<br>1. Sinh viên click "Xem chi tiết" trên một báo cáo<br>2. Mở Dialog hiển thị đầy đủ thông tin<br>3. DialogTitle: "Chi tiết {periodLabel}"<br>4. DialogDescription: "Thời gian: {fromDate} - {toDate}"<br>5. Nếu có fileUrl: Hiển thị iframe xem file<br>6. Hiển thị 4 phần nội dung đã nộp<br>7. Nếu có mentorReview: Hiển thị đánh giá từ GVHD<br>8. Nếu chưa có: Hiển thị "Chưa có đánh giá"<br><br>**LUỒNG 4: UPLOAD FILE ĐÍNH KÈM**<br>1. Sinh viên click "Chọn file" trong form<br>2. Chọn file từ máy tính (PDF/DOC/DOCX, max 10MB)<br>3. Hệ thống hiển thị loading spinner<br>4. POST /api/upload với FormData<br>5. Backend lưu file vào /public/uploads<br>6. Trả về URL file<br>7. Hiển thị tên file và icon thành công<br>8. Toast success: "Tải tệp lên thành công!"<br>9. Lưu fileUrl vào state form |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Không phải trưởng nhóm**<br>- Không hiển thị form nộp báo cáo<br>- Chỉ hiển thị danh sách báo cáo (read-only)<br>- Text: "Chỉ trưởng nhóm mới có thể nộp báo cáo"<br><br>**A2. Đề tài chưa được phê duyệt**<br>- Disable form nộp báo cáo<br>- Alert amber: "Đề tài chưa được phê duyệt"<br>- Chỉ xem được thông tin đề tài<br><br>**A3. Chưa có báo cáo nào**<br>- Empty state trong danh sách<br>- Icon FileText (opacity-30)<br>- Text: "Chưa có báo cáo nào được nộp"<br>- Tuần hiện tại = 1<br><br>**A4. Báo cáo đã được đánh giá**<br>- Badge "Đã đánh giá" màu xanh<br>- Hiển thị điểm số: "{score}/10"<br>- Trong chi tiết: Hiển thị nhận xét từ GVHD<br><br>**A5. Báo cáo chưa được đánh giá**<br>- Badge "Chưa đánh giá" màu xám<br>- Điểm: "Chưa chấm"<br>- Trong chi tiết: "Chưa có đánh giá từ người hướng dẫn"<br><br>**A6. Không upload file**<br>- fileUrl = null<br>- Vẫn cho phép nộp báo cáo<br>- Không hiển thị icon file trong danh sách<br><br>**A7. Xem file trong tab mới**<br>- Click link "Mở trong tab mới"<br>- Mở fileUrl trong tab mới<br>- target="_blank" rel="noopener noreferrer" |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Validation lỗi - Thiếu nội dung**<br>- Toast error: "Vui lòng nhập đầy đủ nội dung báo cáo"<br>- Highlight trường bị thiếu<br>- Form không submit<br><br>**E2. Validation lỗi - Nội dung quá ngắn**<br>- Toast error: "Mỗi phần nội dung phải có ít nhất 10 ký tự"<br>- Form không submit<br><br>**E3. Lỗi upload file - File quá lớn**<br>- Toast error: "File vượt quá 10MB"<br>- Input file reset<br>- fileUrl không được set<br><br>**E4. Lỗi upload file - Định dạng không hợp lệ**<br>- Toast error: "Chỉ chấp nhận file PDF, DOC, DOCX"<br>- Input file reset<br><br>**E5. Lỗi API khi nộp báo cáo**<br>- Toast error với message từ server<br>- Form không reset<br>- Sinh viên có thể sửa và thử lại<br><br>**E6. Lỗi 401 Unauthorized**<br>- Token hết hạn<br>- Redirect về /login<br>- Dữ liệu đã nhập bị mất<br><br>**E7. Lỗi 403 Forbidden**<br>- Không có quyền nộp báo cáo<br>- Toast error: "Bạn không có quyền nộp báo cáo cho đề tài này"<br>- Disable form<br><br>**E8. Lỗi 404 Not Found**<br>- Đề tài không tồn tại<br>- Toast error: "Không tìm thấy đề tài"<br>- Redirect về danh sách đề tài<br><br>**E9. Lỗi network timeout**<br>- Request quá lâu không response<br>- React Query timeout sau 30s<br>- Toast error: "Kết nối bị gián đoạn"<br>- Sinh viên có thể thử lại<br><br>**E10. Lỗi khi load danh sách báo cáo**<br>- API fail<br>- Loading spinner<br>- React Query auto retry 3 lần<br>- Nếu vẫn lỗi: Empty state với message lỗi |

## Sơ đồ Use Case

Xem file: `uml/uc/student/progress-report-submission-usecase.plantuml`

## Các bảng liên quan trong Database

1. **ProgressReport** - Báo cáo tiến độ
   - id, projectId, periodLabel, summary
   - week, fromDate, toDate
   - tasks (công việc được giao)
   - performedContent (nội dung đã thực hiện)
   - results (kết quả đạt được)
   - reportContent (nội dung báo cáo chi tiết)
   - fileUrl (file đính kèm)
   - submittedAt (thời gian nộp)
   - mentorReview, mentorScore (đánh giá từ GVHD)
   - createdAt, updatedAt

2. **Project** - Đề tài nghiên cứu
   - id, title, status
   - leaderId (trưởng nhóm)
   - instructorId (giảng viên hướng dẫn)
   - callRoundId
   - createdAt (dùng làm mốc tính tuần)

3. **User** - Người dùng
   - id, name, email, code, role
   - departmentId, majorId, classId

4. **Notification** - Thông báo
   - id, userId, type, title, message
   - isRead, createdAt

## Quy tắc nghiệp vụ

1. Chỉ trưởng nhóm (leader) mới có quyền nộp báo cáo tiến độ
2. Đề tài phải ở trạng thái APPROVED hoặc IN_PROGRESS
3. Tuần báo cáo tự động tính = số báo cáo đã nộp + 1
4. Thời gian báo cáo tự động tính dựa trên createdAt của đề tài
5. Tất cả 4 phần nội dung đều bắt buộc, mỗi phần tối thiểu 10 ký tự
6. File đính kèm là tùy chọn, nếu có phải là PDF/DOC/DOCX, max 10MB
7. Sau khi nộp, tự động gửi thông báo cho giảng viên hướng dẫn
8. Không thể sửa báo cáo sau khi đã nộp
9. Chỉ giảng viên hướng dẫn mới có thể đánh giá báo cáo
10. Sinh viên có thể xem đánh giá nhưng không thể phản hồi

## Ghi chú kỹ thuật

- **API**: POST /api/projects/[id]/progress-reports, GET /api/projects/[id]/progress-reports, POST /api/upload
- **Hooks**: useProgressReports, useCreateProgressReport
- **Component**: ProgressReportManager (components/projects/progress-report-manager.tsx)
- **Validation**: Client-side (React state) + Server-side (Zod schema)
- **Real-time**: React Query auto refetch sau mutation
- **Rich Text**: Sử dụng RichTextEditor component với TipTap
- **File Upload**: Axios với FormData, lưu vào /public/uploads

## Workflow tổng thể

```
[Sinh viên đăng nhập] → [Truy cập trang đề tài]
    ↓
[Kiểm tra quyền trưởng nhóm]
    ├─→ Không phải: Chỉ xem (read-only)
    └─→ Là trưởng nhóm: Hiển thị form nộp
    ↓
[Tự động tính tuần và thời gian]
    ├─→ Tuần = Số báo cáo + 1
    ├─→ fromDate = startDate + (week-1) tuần
    └─→ toDate = startDate + week tuần
    ↓
[Nhập nội dung báo cáo]
    ├─→ Công việc được giao (Textarea)
    ├─→ Nội dung thực hiện (Rich Text)
    ├─→ Kết quả đạt được (Rich Text)
    ├─→ Báo cáo chi tiết (Rich Text)
    └─→ Upload file (tùy chọn)
    ↓
[Nộp báo cáo] → [Validate] → [POST API]
    ↓
[Backend xử lý]
    ├─→ Tạo ProgressReport (submittedAt = now)
    ├─→ Gửi thông báo cho GVHD
    └─→ Return success
    ↓
[Frontend] → Toast success → Reset form → Refetch danh sách
    ↓
[Xem lịch sử báo cáo]
    ├─→ Hiển thị Table tất cả báo cáo
    ├─→ Sắp xếp theo tuần (mới → cũ)
    ├─→ Xem chi tiết (dialog)
    ├─→ Xem file đính kèm (iframe)
    └─→ Xem đánh giá từ GVHD
```

## So sánh với các Use Case khác

| Tiêu chí | Nộp báo cáo (Student) | Xem nhận xét tiến độ (Lecturer) | Đăng ký đề tài (Student) |
|----------|----------------------|----------------------------------|--------------------------|
| **Actor** | Sinh viên (Trưởng nhóm) | Giảng viên | Sinh viên |
| **Đối tượng** | Báo cáo tiến độ tuần | Báo cáo tiến độ | Đề tài nghiên cứu |
| **Hành động** | Nộp báo cáo mới | Xem và đánh giá | Đăng ký mới |
| **Điều kiện** | Là trưởng nhóm, đề tài đã duyệt | Là GVHD, sinh viên đã nộp | Đợt đang mở, chưa đăng ký |
| **Giới hạn** | 4 phần nội dung bắt buộc | Không giới hạn | 1 đề tài/đợt |
| **Thông báo** | Gửi GVHD | Gửi sinh viên | Gửi GVHD + thành viên |
| **Có thể sửa** | Không (sau khi nộp) | Không (sau khi đánh giá) | Có (khi chưa duyệt) |
| **Trạng thái** | submittedAt | mentorReview, mentorScore | status, instructorStatus |
| **Tự động** | Tính tuần, thời gian | Không | Không |
| **File** | Upload tùy chọn | Xem file | Không |
| **Rich Text** | 3/4 phần | Không | Không |
