# MÔ TẢ USE CASE: NGHIỆM THU ĐỀ TÀI CỦA GIẢNG VIÊN HƯỚNG DẪN

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Nộp/Cập nhật hồ sơ nghiệm thu đề tài |
| 2 | **Tác nhân** | Giảng viên hướng dẫn (LECTURER) |
| 3 | **Mô tả** | Use-case cho phép giảng viên hướng dẫn xem danh sách đề tài mình phụ trách, tải minh chứng PDF theo từng nhóm hồ sơ, sau đó nộp hoặc cập nhật hồ sơ nghiệm thu cho đề tài. |
| 4 | **Tiền điều kiện** | 1. Người dùng đã đăng nhập<br>2. Người dùng có role = `LECTURER`<br>3. Người dùng là giảng viên hướng dẫn của đề tài (`Project.instructorId = userId`)<br>4. Đề tài tồn tại trong hệ thống<br>5. Truy cập được trang `/lecturer/project-closings` |
| 5 | **Hậu điều kiện** | 1. Bản ghi `ProjectClosingSubmission` được tạo mới/cập nhật theo `projectId` (upsert)<br>2. Trạng thái hồ sơ set về `SUBMITTED`<br>3. `submittedAt` cập nhật thời điểm nộp mới nhất<br>4. Ghi chú và nhóm tệp được lưu vào DB<br>5. Danh sách trên giao diện được refresh |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: XEM DANH SÁCH ĐỀ TÀI**<br><br>**Bước 1: Truy cập trang**<br>1. Giảng viên đăng nhập hệ thống<br>2. Truy cập `/lecturer/project-closings`<br>3. Frontend render `LecturerProjectClosingManagementPage`<br><br>**Bước 2: Tải dữ liệu danh sách**<br>4. Hook `useLecturerProjectClosings` gọi API `GET /api/lecturer/project-closings`<br>5. Backend lấy session bằng `getAuthUser()`<br>6. Backend kiểm tra role = `LECTURER`<br>7. Query `Project` với điều kiện `instructorId = user.userId`<br>8. Join dữ liệu: đề tài, đợt đề tài (`callRound`), sinh viên chủ trì (`leader`), hồ sơ nghiệm thu (`closingSubmission`)<br>9. Sắp xếp `orderBy updatedAt desc`<br>10. Parse các trường file JSON sang mảng file hợp lệ (`safeParse`, fail thì fallback `[]`)<br>11. Trả về danh sách item `{ project, submission }`<br><br>**Bước 3: Hiển thị danh sách**<br>12. Frontend hiển thị bảng: STT, đề tài, sinh viên, đợt đề tài, trạng thái đề tài, trạng thái hồ sơ nghiệm thu, thao tác<br>13. Nếu chưa có hồ sơ: badge `Chưa nộp`<br>14. Nếu đã có hồ sơ: hiển thị `SUBMITTED/REVISION_REQUESTED/APPROVED` + tiến độ nhóm tệp bắt buộc<br>15. Nút thao tác:<br>&nbsp;&nbsp;&nbsp;• `Nộp hồ sơ` (chưa có submission)<br>&nbsp;&nbsp;&nbsp;• `Cập nhật hồ sơ` (đã có submission)<br><br>**LUỒNG 2: LỌC/TÌM KIẾM DANH SÁCH**<br><br>1. Giảng viên chọn `callRoundFilter` hoặc nhập `searchKeyword`<br>2. Frontend lọc dữ liệu tại client (không gọi lại API)<br>3. Từ khóa áp dụng trên: `project.title`, `student.name`, `student.code`, `student.email`, `callRound.name`<br>4. Bảng cập nhật tức thời theo kết quả lọc<br><br>**LUỒNG 3: MỞ FORM NỘP HỒ SƠ**<br><br>1. Giảng viên nhấn `Nộp hồ sơ` hoặc `Cập nhật hồ sơ`<br>2. Hệ thống mở Dialog nộp hồ sơ nghiệm thu<br>3. Nếu đã có submission: form được prefill dữ liệu đã lưu<br>4. Form hiển thị 8 nhóm tệp:<br>&nbsp;&nbsp;&nbsp;• `reportFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `researchSourceCodeFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `researchGuideFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `administrativeDefenseApplicationFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `administrativeAchievementEvidenceFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `administrativeAdvisorReviewFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `presentationSlideFiles` (Bắt buộc)<br>&nbsp;&nbsp;&nbsp;• `presentationVideoFiles` (Tùy chọn)<br>5. Hiển thị tiến độ hoàn tất nhóm bắt buộc và tổng số tệp đã tải lên<br><br>**LUỒNG 4: TẢI TỆP**<br><br>1. Giảng viên chọn 1 hoặc nhiều file trong từng nhóm<br>2. Frontend upload từng file qua `POST /api/upload` (multipart `FormData`)<br>3. API upload kiểm tra session và chỉ nhận PDF (theo `file.type` hoặc đuôi `.pdf`)<br>4. Nếu hợp lệ: lưu file vào `public/uploads` và trả `url`<br>5. Frontend thêm file vào nhóm tương ứng<br>6. Giảng viên có thể xóa file khỏi state form trước khi submit<br><br>**LUỒNG 5: NỘP/CẬP NHẬT HỒ SƠ**<br><br>1. Giảng viên nhấn `Nộp hồ sơ nghiệm thu`<br>2. Frontend tạo payload gồm `projectId`, `note`, 8 mảng file<br>3. `note` được trim; rỗng thì gửi `null`<br>4. Frontend gọi `POST /api/lecturer/project-closings`<br>5. Backend validate payload bằng `submitProjectClosingSchema`<br>6. Backend kiểm tra đề tài tồn tại và thuộc giảng viên hiện tại (`instructorId = user.userId`)<br>7. Backend `upsert` theo `projectId`:<br>&nbsp;&nbsp;&nbsp;• `create` nếu chưa có hồ sơ<br>&nbsp;&nbsp;&nbsp;• `update` nếu đã có hồ sơ<br>8. Trong cả create/update, backend set:<br>&nbsp;&nbsp;&nbsp;• `status = SUBMITTED`<br>&nbsp;&nbsp;&nbsp;• `submittedById = user.userId`<br>&nbsp;&nbsp;&nbsp;• `submittedAt = new Date()`<br>&nbsp;&nbsp;&nbsp;• cập nhật note + toàn bộ nhóm tệp<br>9. Backend trả `201` + dữ liệu submission mới nhất<br><br>**LUỒNG 6: HIỂN THỊ KẾT QUẢ**<br><br>1. Frontend hiển thị toast `Nộp hồ sơ nghiệm thu thành công`<br>2. Đóng dialog<br>3. Invalidate query key `lecturer-project-closings`<br>4. Tải lại danh sách và hiển thị trạng thái mới |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Chưa có đề tài hướng dẫn**<br>1. API trả danh sách rỗng<br>2. UI hiển thị `Không có đề tài phù hợp với bộ lọc hiện tại.`<br><br>**A2. Chưa có hồ sơ nghiệm thu**<br>1. `submission = null`<br>2. Hiển thị badge `Chưa nộp`<br>3. Nút thao tác: `Nộp hồ sơ`<br><br>**A3. Đã có hồ sơ nghiệm thu**<br>1. `submission != null`<br>2. Nút thao tác: `Cập nhật hồ sơ`<br>3. Form nạp sẵn dữ liệu cũ<br><br>**A4. Hồ sơ từng ở trạng thái REVISION_REQUESTED**<br>1. Giảng viên chỉnh sửa và nộp lại<br>2. Hệ thống set lại `status = SUBMITTED`<br><br>**A5. Hồ sơ từng ở trạng thái APPROVED**<br>1. Giảng viên vẫn có thể nộp cập nhật (theo logic hiện tại)<br>2. Sau submit, hệ thống set lại `status = SUBMITTED`<br><br>**A6. Không tải video**<br>1. `presentationVideoFiles` để rỗng<br>2. Payload vẫn hợp lệ (video tùy chọn)<br><br>**A7. Tải nhiều file cùng nhóm**<br>1. Input file có `multiple`<br>2. Frontend upload tuần tự từng file<br>3. Cộng dồn vào nhóm tương ứng<br><br>**A8. Xóa file khỏi form trước khi submit**<br>1. Giảng viên nhấn icon xóa<br>2. Frontend loại file khỏi state<br>3. Payload theo danh sách mới<br><br>**A9. Ghi chú để trống**<br>1. Người dùng không nhập note<br>2. Frontend gửi `note = null`<br><br>**A10. Lọc theo đợt đề tài**<br>1. Người dùng chọn call round ở dropdown<br>2. Chỉ hiển thị item có `project.callRound.id` tương ứng |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Chưa đăng nhập**<br>1. Gọi API khi không có session<br>2. API trả `401 Unauthorized`<br><br>**E2. Sai vai trò**<br>1. User không phải `LECTURER` gọi API giảng viên<br>2. API trả `401 Unauthorized`<br><br>**E3. Đề tài không thuộc quyền giảng viên**<br>1. `projectId` không thuộc `instructorId` hiện tại<br>2. API trả `404 Project not found`<br><br>**E4. Payload thiếu nhóm tệp bắt buộc**<br>1. Thiếu 1 trong các mảng bắt buộc<br>2. Zod fail<br>3. API trả `400 Invalid payload` + `fields` lỗi chi tiết<br><br>**E5. Upload file không phải PDF**<br>1. Người dùng tải file khác PDF<br>2. API upload trả `400` với lỗi `Only PDF files are allowed`<br><br>**E6. Upload lỗi mạng/server**<br>1. Upload thất bại<br>2. Frontend hiển thị toast lỗi (`Không thể tải lên tệp` hoặc message trả về)<br><br>**E7. Lỗi khi submit hồ sơ**<br>1. Backend lỗi trong lúc lưu DB<br>2. API trả `500 Failed to submit project closing`<br>3. Frontend hiển thị toast lỗi<br><br>**E8. Session hết hạn trong lúc thao tác**<br>1. Form đang mở nhưng session hết hạn<br>2. Upload hoặc submit nhận `401`<br>3. Người dùng cần đăng nhập lại<br><br>**E9. Dữ liệu JSON file cũ không hợp lệ**<br>1. Trường file trong DB chứa JSON lỗi<br>2. `safeParse` thất bại<br>3. Backend fallback `[]` để tránh crash |

## Sơ đồ Use Case

Chưa có file PlantUML riêng cho use-case này.

## Các bảng liên quan trong Database

1. **Project**
   - `id`: ID đề tài
   - `title`: Tên đề tài
   - `status`: Trạng thái đề tài
   - `instructorId`: Giảng viên hướng dẫn
   - `leaderId`: Sinh viên chủ trì
   - `callRoundId`: Đợt đề tài

2. **ProjectClosingSubmission**
   - `id`: ID hồ sơ nghiệm thu
   - `projectId`: ID đề tài (unique)
   - `submittedById`: Người nộp hồ sơ
   - `status`: `SUBMITTED / REVISION_REQUESTED / APPROVED`
   - `note`: Ghi chú
   - `reportFiles`: JSON danh sách tệp báo cáo
   - `researchSourceCodeFiles`: JSON danh sách source code
   - `researchGuideFiles`: JSON tài liệu hướng dẫn
   - `administrativeDefenseApplicationFiles`: JSON đơn xin bảo vệ/nghiệm thu
   - `administrativeAchievementEvidenceFiles`: JSON minh chứng thành tích
   - `administrativeAdvisorReviewFiles`: JSON bản nhận xét GVHD
   - `presentationSlideFiles`: JSON slide thuyết trình
   - `presentationVideoFiles`: JSON video
   - `submittedAt`: Thời điểm nộp

3. **User**
   - `id`: ID người dùng
   - `name`, `email`, `code`
   - `role`: Vai trò (`LECTURER`, `STUDENT`, ...)

4. **CallRound**
   - `id`, `name`: Thông tin đợt đề tài

## Quy tắc nghiệp vụ

1. Chỉ tài khoản `LECTURER` được gọi API nghiệm thu phía giảng viên.
2. Chỉ giảng viên có `Project.instructorId = userId` mới thao tác đề tài đó.
3. Mỗi đề tài tối đa 1 bản ghi nghiệm thu (`projectId` unique), cập nhật bằng upsert.
4. Nộp mới hoặc cập nhật đều set lại `status = SUBMITTED`.
5. Các nhóm bắt buộc phải có ít nhất 1 file: `reportFiles`, `researchSourceCodeFiles`, `researchGuideFiles`, `administrativeDefenseApplicationFiles`, `administrativeAchievementEvidenceFiles`, `administrativeAdvisorReviewFiles`, `presentationSlideFiles`.
6. `presentationVideoFiles` tùy chọn.
7. Upload chỉ chấp nhận PDF.
8. `note` tùy chọn; rỗng lưu `null`.
9. Danh sách đề tài trả theo `updatedAt desc`.
10. Lọc/tìm kiếm trên trang giảng viên chạy phía client.

## Ghi chú kỹ thuật

- **UI page**:
  - `app/lecturer/project-closings/page.tsx`
  - `components/lecturer/project-closing-management-page.tsx`
- **Hook/API client**:
  - `hooks/useLecturerProjectClosings.ts`
  - `api/lecturer-project-closings.ts`
- **Backend API**:
  - `GET /api/lecturer/project-closings`
  - `POST /api/lecturer/project-closings`
  - `POST /api/upload`
  - `DELETE /api/upload`
- **Validation schema**:
  - `types/project-closing.schema.ts`
  - `submitProjectClosingSchema`
  - `uploadedEvidenceFileSchema`

## Workflow tổng thể

```
[Giảng viên đăng nhập]
    ↓
[Mở trang /lecturer/project-closings]
    ↓
[GET /api/lecturer/project-closings]
    ├─→ Check role LECTURER
    ├─→ Lấy Project theo instructorId
    └─→ Trả project + submission
    ↓
[Lọc/tìm kiếm danh sách]
    ↓
[Mở form nộp hồ sơ]
    ↓
[Upload PDF theo nhóm]
    ├─→ POST /api/upload
    └─→ Nhận URL file
    ↓
[Nhấn "Nộp hồ sơ nghiệm thu"]
    ↓
[POST /api/lecturer/project-closings]
    ├─→ Validate payload
    ├─→ Check quyền instructorId
    ├─→ Upsert ProjectClosingSubmission
    └─→ Set status SUBMITTED + submittedAt now
    ↓
[Toast thành công + đóng dialog + refresh danh sách]
```
