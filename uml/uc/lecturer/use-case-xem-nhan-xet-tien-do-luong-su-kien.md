# LUỒNG SỰ KIỆN CHI TIẾT - XEM VÀ NHẬN XÉT TIẾN ĐỘ

## 6. LUỒNG SỰ KIỆN CHÍNH (Main Flow)

### Luồng 1: Xem danh sách đề tài hướng dẫn

| Bước | Hành động của Actor | Phản hồi của Hệ thống |
|------|---------------------|----------------------|
| 1 | Giảng viên đăng nhập và truy cập menu "Xem báo cáo sinh viên" | Hệ thống chuyển đến trang `/lecturer/review-progress` |
| 2 | - | Hệ thống load danh sách projects có `instructorId = userId` của giảng viên |
| 3 | - | Hiển thị Card "Danh sách đề tài hướng dẫn" với thông tin:<br>• Tổng số đề tài đang hướng dẫn<br>• Dropdown lọc theo đợt<br>• Ô tìm kiếm<br>• Nút "Đặt lịch" (tổng quát) |
| 4 | - | Hiển thị Table với các cột:<br>• STT<br>• Tên đề tài<br>• Trưởng nhóm (tên + icon)<br>• MSSV<br>• Email (với icon)<br>• SĐT (với icon)<br>• Trạng thái (Badge)<br>• Thao tác (2 nút: "Đặt lịch", "Xem báo cáo") |
| 5 | Giảng viên có thể:<br>• Lọc theo đợt<br>• Tìm kiếm theo tên đề tài/sinh viên/MSSV/email<br>• Click vào dòng để xem báo cáo<br>• Click nút "Xem báo cáo"<br>• Click nút "Đặt lịch" | Hệ thống filter/search real-time trên client-side |

### Luồng 2: Xem chi tiết báo cáo tiến độ

| Bước | Hành động của Actor | Phản hồi của Hệ thống |
|------|---------------------|----------------------|
| 1 | Giảng viên click "Xem báo cáo" hoặc click vào dòng đề tài | Hệ thống set `selectedProjectId = project.id` |
| 2 | - | Hiển thị nút "Quay lại danh sách" (với icon ArrowLeft) |
| 3 | - | Hiển thị **Card Thông tin đề tài** (bg-primary/5):<br>• Tên đề tài (CardTitle)<br>• Nút "Đặt lịch họp" (góc phải)<br>• Thông tin: Trưởng nhóm, MSSV, Email, Badge trạng thái |
| 4 | - | Render component `<ProgressReportPanel projectId={selectedProjectId} />` |
| 5 | - | **Phần 1: Thông tin đề tài** (Card):<br>• Tên đề tài<br>• Giảng viên hướng dẫn<br>• Đợt đăng ký<br>• Mẫu báo cáo tiến độ (nếu có) |
| 6 | - | **Phần 3: Danh sách báo cáo tuần** (Card):<br>• Load `GET /api/projects/[id]/progress-reports`<br>• Hiển thị Table với các cột:<br>&nbsp;&nbsp;- STT<br>&nbsp;&nbsp;- Tên báo cáo (periodLabel)<br>&nbsp;&nbsp;- Tuần (week)<br>&nbsp;&nbsp;- Thời gian (fromDate - toDate)<br>&nbsp;&nbsp;- Điểm (mentorScore/10 hoặc "Chưa chấm")<br>&nbsp;&nbsp;- Trạng thái (Badge: "Đã đánh giá" / "Chưa đánh giá")<br>&nbsp;&nbsp;- Thao tác (Icon "Xem file", Nút "Xem") |
| 7 | Giảng viên click nút "Xem" trên một báo cáo | Chuyển sang **Luồng 3: Xem chi tiết và nhận xét báo cáo** |

### Luồng 3: Xem chi tiết và nhận xét báo cáo

| Bước | Hành động của Actor | Phản hồi của Hệ thống |
|------|---------------------|----------------------|
| 1 | Giảng viên click "Xem" trên báo cáo | Hệ thống set `selectedReport = report` và mở Dialog |
| 2 | - | Dialog hiển thị (max-w-66vw, max-h-90vh):<br>• DialogTitle: "Chi tiết {periodLabel}"<br>• DialogDescription: "Thời gian: {fromDate} - {toDate}" |
| 3 | - | **Nếu có fileUrl**, hiển thị section "File báo cáo đính kèm":<br>• Header với icon FileText<br>• Link "Mở trong tab mới"<br>• iframe hiển thị file (h-100) |
| 4 | - | Hiển thị **Nội dung báo cáo** (4 sections):<br>1. **Công việc được giao** (text, bg-muted/30)<br>2. **Nội dung đã thực hiện** (HTML, prose)<br>3. **Kết quả đạt được** (HTML, prose)<br>4. **Nội dung báo cáo chi tiết** (HTML, prose) |
| 5 | - | Hiển thị **Phần đánh giá của Người Hướng Dẫn**:<br>• Nếu `mentorReview` tồn tại:<br>&nbsp;&nbsp;- Hiển thị nhận xét (read-only, bg-primary/5)<br>&nbsp;&nbsp;- Hiển thị điểm số (font-semibold, text-lg)<br>• Nếu chưa có và `isMentor = true`:<br>&nbsp;&nbsp;- Hiển thị form nhập (bg-muted/30)<br>• Nếu không phải mentor:<br>&nbsp;&nbsp;- Hiển thị "Chưa có đánh giá từ người hướng dẫn" |
| 6 | Giảng viên nhập nhận xét vào Textarea | Hệ thống update state `reviewNote` |
| 7 | Giảng viên nhập điểm số (0-10, step 0.5) | Hệ thống update state `reviewScore` |
| 8 | Giảng viên click "Lưu đánh giá" | Chuyển sang **Luồng 4: Lưu đánh giá** |

### Luồng 4: Lưu đánh giá báo cáo

| Bước | Hành động của Actor | Phản hồi của Hệ thống |
|------|---------------------|----------------------|
| 1 | Giảng viên click "Lưu đánh giá" | Hệ thống validate:<br>• `reviewScore` phải là số từ 0-10<br>• `reviewNote` không được rỗng |
| 2 | - | Nếu validation fail:<br>• Toast error: "Điểm không hợp lệ (0-10)" hoặc "Vui lòng nhập nhận xét"<br>• Dừng lại |
| 3 | - | Nếu validation pass:<br>• Gọi `reviewMutation.mutate()` |
| 4 | - | Frontend gửi request:<br>`PATCH /api/progress-reports/[id]`<br>Body: `{ mentorReview, mentorScore }` |
| 5 | - | **Backend xử lý:**<br>1. Lấy `actorRole` và `actorUserId` từ request<br>2. Kiểm tra unauthorized (401)<br>3. Parse body với `reviewProgressReportSchema`<br>4. Tìm report trong DB (include project)<br>5. Kiểm tra role (ADMIN/DEAN/COUNCIL/LEADER/LECTURER)<br>6. Nếu không có quyền: 403 "Không có quyền nhận xét"<br>7. Update report: `mentorReview`, `mentorScore`<br>8. Gọi `notifyProgressReportReviewed()` để gửi thông báo<br>9. Return success với data updated |
| 6 | - | **Frontend nhận response:**<br>• onSuccess:<br>&nbsp;&nbsp;- Toast success: "Đã lưu đánh giá báo cáo"<br>&nbsp;&nbsp;- Đóng dialog (`setDetailDialogOpen(false)`)<br>&nbsp;&nbsp;- React Query tự động refetch danh sách<br>• onError:<br>&nbsp;&nbsp;- Toast error: "Lỗi khi lưu đánh giá" |
| 7 | - | Danh sách báo cáo refresh:<br>• Báo cáo vừa nhận xét hiển thị:<br>&nbsp;&nbsp;- Điểm số: Badge "{score}/10"<br>&nbsp;&nbsp;- Trạng thái: Badge "Đã đánh giá" (bg-green-600) |

### Luồng 5: Đặt lịch họp với sinh viên

| Bước | Hành động của Actor | Phản hồi của Hệ thống |
|------|---------------------|----------------------|
| 1 | Giảng viên click "Đặt lịch" (từ danh sách hoặc chi tiết đề tài) | Hệ thống gọi `openMeetingDialog(project?)` |
| 2 | - | Mở Dialog "Đặt lịch họp" (sm:max-w-1/2):<br>• Set `meetingCallRoundId` = project.callRoundId hoặc 'ALL'<br>• Set `meetingProjectId` = project.id hoặc ''<br>• Reset các state khác |
| 3 | - | Hiển thị form với các trường:<br>1. **Đợt đề tài** (Select dropdown)<br>2. **Đề tài** (Select dropdown, filter theo đợt)<br>3. **Thông tin đề tài đã chọn** (Card, nếu có)<br>4. **Thành viên nhận lịch** (Checkbox list)<br>5. **Thời gian họp** (datetime-local)<br>6. **Địa điểm / Link họp** (Input text)<br>7. **Ghi chú** (Textarea) |
| 4 | Giảng viên chọn đợt đề tài | Hệ thống filter danh sách đề tài theo `callRoundId` |
| 5 | Giảng viên chọn đề tài | Hệ thống:<br>• Load danh sách thành viên: `GET /api/office-meetings/[projectId]/members`<br>• Hiển thị Card thông tin đề tài<br>• Hiển thị section "Thành viên nhận lịch" với:<br>&nbsp;&nbsp;- Checkbox cho từng thành viên<br>&nbsp;&nbsp;- Nút "Chọn tất cả" / "Bỏ chọn"<br>&nbsp;&nbsp;- Text: "Đã chọn X thành viên" hoặc "Gửi cho toàn bộ" |
| 6 | Giảng viên chọn/bỏ chọn thành viên | Hệ thống update `selectedMeetingMemberIds` array |
| 7 | Giảng viên nhập thời gian, địa điểm, ghi chú | Hệ thống update các state tương ứng |
| 8 | Giảng viên click "Xác nhận đặt lịch" | Hệ thống validate:<br>• Đã chọn đề tài<br>• Có thời gian họp<br>• Có địa điểm |
| 9 | - | Nếu validation fail:<br>• Toast error với message tương ứng<br>• Dừng lại |
| 10 | - | Nếu validation pass:<br>• Gọi `createOfficeMeeting.mutate()` |
| 11 | - | Frontend gửi request:<br>`POST /api/office-meetings`<br>Body:<br>```json<br>{<br>  "projectId": "...",<br>  "meetingTarget": "GROUP",<br>  "meetingAt": "2026-04-15T10:00",<br>  "location": "Phòng A2.03",<br>  "note": "Chuẩn bị...",<br>  "memberUserIds": ["id1", "id2"]<br>}<br>``` |
| 12 | - | **Backend xử lý:**<br>1. Validate payload<br>2. Tạo OfficeMeeting mới<br>3. Gửi thông báo cho các thành viên<br>4. Return success |
| 13 | - | **Frontend nhận response:**<br>• onSuccess:<br>&nbsp;&nbsp;- Toast success: "Đã đặt lịch họp thành công"<br>&nbsp;&nbsp;- Đóng dialog<br>• onError:<br>&nbsp;&nbsp;- Toast error với message |

## 7. LUỒNG SỰ KIỆN RẼ NHÁNH (Alternative Flows)

### 7.1. Không có đề tài nào

| Điều kiện | Khi giảng viên chưa được phân công hướng dẫn đề tài nào |
|-----------|--------------------------------------------------------|
| Hiển thị | Card "Danh sách đề tài hướng dẫn" với:<br>• Text: "Có 0 đề tài bạn đang hướng dẫn"<br>• Empty state: "Bạn chưa được phân công hướng dẫn đề tài nào." |

### 7.2. Không tìm thấy kết quả tìm kiếm

| Điều kiện | Khi search/filter không có kết quả |
|-----------|-----------------------------------|
| Hiển thị | Empty state: "Không tìm thấy kết quả phù hợp." |

### 7.3. Đề tài chưa có báo cáo nào

| Điều kiện | Khi sinh viên chưa nộp báo cáo tiến độ |
|-----------|---------------------------------------|
| Hiển thị | **Phần 3: Danh sách báo cáo tuần**<br>• Empty state với icon FileText (opacity-30)<br>• Text: "Chưa có báo cáo nào được nộp." |

### 7.4. Báo cáo không có file đính kèm

| Điều kiện | Khi `report.fileUrl = null` |
|-----------|----------------------------|
| Hiển thị | Không hiển thị section "File báo cáo đính kèm"<br>Không hiển thị nút icon FileText trong Table |

### 7.5. Báo cáo đã được đánh giá

| Điều kiện | Khi `report.mentorReview` và `report.mentorScore` đã tồn tại |
|-----------|-------------------------------------------------------------|
| Hiển thị | **Phần đánh giá** (read-only):<br>• Card với bg-primary/5, border-primary/20<br>• Nhận xét (text)<br>• Điểm số (font-semibold, text-lg)<br>• Không hiển thị form nhập |

### 7.6. Người xem không phải mentor

| Điều kiện | Khi `isMentor = false` (role không phải LECTURER/DEAN/ADMIN/LEADER/COUNCIL) |
|-----------|----------------------------------------------------------------------------|
| Hiển thị | **Phần đánh giá**:<br>• Nếu đã có đánh giá: Hiển thị read-only<br>• Nếu chưa có: Text "Chưa có đánh giá từ người hướng dẫn" (italic, bg-muted/20) |

### 7.7. Đặt lịch không chọn thành viên cụ thể

| Điều kiện | Khi `selectedMeetingMemberIds.length = 0` |
|-----------|------------------------------------------|
| Xử lý | Backend nhận `memberUserIds = undefined`<br>Hệ thống gửi thông báo cho toàn bộ thành viên đề tài |

### 7.8. Đợt đề tài không có project nào

| Điều kiện | Khi chọn đợt nhưng không có đề tài phù hợp |
|-----------|-------------------------------------------|
| Hiển thị | Dropdown "Đề tài" rỗng<br>Text: "Không có đề tài phù hợp trong đợt đã chọn." |

### 7.9. Xem file trong tab mới

| Điều kiện | Khi giảng viên click link "Mở trong tab mới" |
|-----------|---------------------------------------------|
| Xử lý | Mở `report.fileUrl` trong tab mới của browser<br>Sử dụng `target="_blank" rel="noopener noreferrer"` |

### 7.10. Đề tài có mẫu tiến độ

| Điều kiện | Khi `project.callRound.template` tồn tại |
|-----------|----------------------------------------|
| Hiển thị | **Phần 1: Thông tin đề tài**<br>• Thêm dòng "Mẫu báo cáo tiến độ"<br>• Text: "{templateName} ({X} tuần)" với màu primary |

## 8. LUỒNG SỰ KIỆN NGOẠI LỆ (Exception Flows)

### 8.1. Lỗi khi load danh sách đề tài

| Lỗi | API `/api/projects` fail |
|-----|-------------------------|
| Hiển thị | Loading spinner với text "Đang tải dữ liệu..."<br>Nếu lỗi: React Query tự động retry 3 lần |

### 8.2. Lỗi khi load báo cáo tiến độ

| Lỗi | API `/api/projects/[id]/progress-reports` fail |
|-----|-----------------------------------------------|
| Hiển thị | Loading spinner trong Card<br>Nếu lỗi: Empty state với message lỗi |

### 8.3. Lỗi validation khi nhận xét

| Lỗi | Điểm số không hợp lệ hoặc nhận xét rỗng |
|-----|----------------------------------------|
| Hiển thị | Toast error:<br>• "Điểm không hợp lệ (0-10)"<br>• "Vui lòng nhập nhận xét"<br>Form không submit |

### 8.4. Lỗi 401 Unauthorized

| Lỗi | Token hết hạn hoặc không hợp lệ |
|-----|--------------------------------|
| Xử lý | Backend return 401<br>Frontend redirect về `/login` |

### 8.5. Lỗi 403 Forbidden

| Lỗi | Không có quyền nhận xét báo cáo |
|-----|--------------------------------|
| Hiển thị | Toast error: "Không có quyền nhận xét."<br>Không hiển thị form nhập đánh giá |

### 8.6. Lỗi 404 Not Found

| Lỗi | Báo cáo không tồn tại |
|-----|----------------------|
| Hiển thị | Toast error: "Report not found"<br>Đóng dialog |

### 8.7. Lỗi 500 Server Error

| Lỗi | Lỗi server khi lưu đánh giá |
|-----|----------------------------|
| Hiển thị | Toast error: "Failed to update review"<br>Form vẫn mở để user thử lại |

### 8.8. Lỗi khi gửi thông báo

| Lỗi | `notifyProgressReportReviewed()` fail |
|-----|--------------------------------------|
| Xử lý | Backend log error nhưng không fail request<br>Đánh giá vẫn được lưu thành công<br>Console.error: "Failed to send notification" |

### 8.9. Lỗi validation khi đặt lịch

| Lỗi | Thiếu thông tin bắt buộc |
|-----|-------------------------|
| Hiển thị | Toast error:<br>• "Vui lòng chọn đề tài"<br>• "Đề tài không hợp lệ"<br>• "Vui lòng chọn thời gian họp"<br>• "Vui lòng nhập địa điểm họp"<br>Dialog không đóng |

### 8.10. Lỗi khi load danh sách thành viên

| Lỗi | API `/api/office-meetings/[projectId]/members` fail |
|-----|---------------------------------------------------|
| Hiển thị | Text: "Đang tải danh sách thành viên..."<br>Nếu lỗi: "Không có dữ liệu thành viên để lựa chọn." |

### 8.11. Lỗi khi upload file (nếu có)

| Lỗi | API `/api/upload` fail |
|-----|----------------------|
| Hiển thị | Toast error: "Lỗi tải file" hoặc message từ server<br>Input file reset |

### 8.12. Lỗi network timeout

| Lỗi | Request quá lâu không response |
|-----|-------------------------------|
| Xử lý | React Query timeout sau 30s<br>Toast error: "Kết nối bị gián đoạn"<br>User có thể thử lại |

## 9. ĐIỀU KIỆN TIỀN/HẬU CHI TIẾT

### Tiền điều kiện chi tiết

1. **Xác thực:**
   - Session token hợp lệ trong cookie
   - `session.userId` tồn tại
   - `session.role` thuộc danh sách cho phép

2. **Dữ liệu:**
   - Có ít nhất 1 Project với `instructorId = session.userId`
   - Project có `status != DRAFT`
   - CallRound của project đang active (nếu cần)

3. **Quyền hạn:**
   - Để xem: Role = LECTURER (hoặc DEAN/ADMIN/LEADER/COUNCIL)
   - Để nhận xét: Role = LECTURER/DEAN/ADMIN/LEADER/COUNCIL
   - Để đặt lịch: Role = LECTURER

### Hậu điều kiện chi tiết

1. **Sau khi xem danh sách:**
   - State `projects` được populate
   - State `instructorProjects` được filter
   - UI render Table với đầy đủ thông tin
   - Search và filter hoạt động real-time

2. **Sau khi xem báo cáo:**
   - State `selectedProjectId` được set
   - State `reports` được load từ API
   - UI render 3 phần: Thông tin, (Form nộp - nếu là leader), Danh sách báo cáo
   - Mỗi báo cáo hiển thị đúng trạng thái

3. **Sau khi nhận xét:**
   - Database: `ProgressReport.mentorReview` và `mentorScore` được update
   - Notification được tạo và gửi cho `project.leaderId`
   - React Query cache invalidate và refetch
   - UI update: Badge "Đã đánh giá", điểm số hiển thị
   - Dialog đóng

4. **Sau khi đặt lịch:**
   - Database: `OfficeMeeting` mới được tạo
   - Notifications được tạo cho các `memberUserIds`
   - Dialog đóng
   - Toast success hiển thị

## 10. BUSINESS RULES CHI TIẾT

1. **Quyền xem đề tài:**
   - Chỉ xem được đề tài có `instructorId = userId`
   - Không xem được đề tài của giảng viên khác
   - ADMIN/DEAN có thể xem tất cả (nếu cần)

2. **Quyền nhận xét:**
   - Role phải thuộc: LECTURER, DEAN, ADMIN, LEADER, COUNCIL
   - Không kiểm tra `instructorId` ở backend (tin tưởng frontend filter)
   - Một khi đã nhận xét, không thể sửa (UI không cho phép)

3. **Điểm số:**
   - Min: 0, Max: 10
   - Step: 0.5 (có thể nhập 7.5, 8.5, etc.)
   - Validation: `z.number().min(0).max(10)`

4. **Nhận xét:**
   - Bắt buộc phải có text
   - Min length: 1 character
   - Validation: `z.string().min(1, "Vui lòng nhập nhận xét")`

5. **File đính kèm:**
   - Hỗ trợ: PDF, Word, Image
   - Hiển thị trong iframe
   - Có link mở tab mới

6. **Mẫu tiến độ:**
   - Từ `CallRound.template`
   - Sinh viên chọn tuần để nộp
   - Mỗi tuần chỉ nộp 1 lần
   - Giảng viên chỉ xem, không tương tác

7. **Đặt lịch họp:**
   - Có thể chọn thành viên cụ thể hoặc toàn bộ
   - Thời gian bắt buộc (datetime-local)
   - Địa điểm bắt buộc (text hoặc link)
   - Ghi chú tùy chọn

8. **Thông báo:**
   - Sau nhận xét: Gửi cho `project.leaderId`
   - Sau đặt lịch: Gửi cho `memberUserIds` hoặc toàn bộ
   - Nếu gửi thông báo fail: Log error nhưng không fail request

9. **Lọc và tìm kiếm:**
   - Lọc theo đợt: Client-side filter
   - Tìm kiếm: Client-side search (debounce 300ms)
   - Search fields: title, leader.name, leader.code, leader.email

10. **Loading states:**
    - Skeleton/Spinner khi load data
    - Disable button khi đang submit
    - Loading text: "Đang tải...", "Đang gửi...", "Đang lưu..."
