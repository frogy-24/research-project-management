# MÔ TẢ USE CASE: GIẢI NGÂN KINH PHÍ ĐỀ TÀI

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Giải ngân kinh phí đề tài |
| 2 | **Tác nhân** | Admin (Phòng Quản lý Khoa học) |
| 3 | **Mô tả** | Use-case này cho phép Admin tạo đợt giải ngân kinh phí cho các đề tài nghiên cứu đã được phê duyệt. Admin có thể xem danh sách đề tài đủ điều kiện giải ngân, tạo đợt giải ngân mới với số tiền và chứng từ đính kèm, theo dõi lịch sử giải ngân của từng đề tài. |
| 4 | **Tiền điều kiện** | 1. Admin đã đăng nhập vào hệ thống<br>2. Admin có quyền giải ngân kinh phí (role = ADMIN)<br>3. Có ít nhất một đề tài ở trạng thái "Đang thực hiện" (IN_PROGRESS)<br>4. Đề tài đã được phê duyệt kinh phí (budgetApproved > 0)<br>5. Đề tài chưa bị đình chỉ kinh phí (budgetSuspended = false) |
| 5 | **Hậu điều kiện** | **Khi tạo giải ngân thành công:**<br>1. Bản ghi FundingDisbursement được tạo mới trong hệ thống<br>2. Số tiền giải ngân được ghi nhận vào đề tài<br>3. Chứng từ giải ngân được lưu trữ (nếu có)<br>4. Chủ nhiệm đề tài nhận được thông báo về đợt giải ngân<br>5. Hệ thống kiểm tra tổng giải ngân không vượt quá kinh phí phê duyệt<br><br>**Khi giải ngân thất bại:**<br>1. Không có bản ghi nào được tạo<br>2. Hiển thị thông báo lỗi cho Admin<br>3. Admin có thể thử lại sau khi sửa lỗi |
| 6 | **Luồng sự kiện chính** | **Bước 1: Truy cập trang quản lý giải ngân**<br>1. Admin đăng nhập vào hệ thống<br>2. Admin điều hướng đến trang "Quản lý Giải ngân"<br>3. Hệ thống hiển thị danh sách đề tài đủ điều kiện giải ngân<br><br>**Bước 2: Xem thông tin đề tài**<br>4. Admin có thể lọc danh sách theo:<br>&nbsp;&nbsp;&nbsp;• Trạng thái giải ngân (Chưa giải ngân / Đang giải ngân / Đã giải ngân hết)<br>&nbsp;&nbsp;&nbsp;• Khoa/Đơn vị<br>&nbsp;&nbsp;&nbsp;• Loại đề tài<br>&nbsp;&nbsp;&nbsp;• Đợt đăng ký<br>5. Admin nhấn vào đề tài để xem chi tiết:<br>&nbsp;&nbsp;&nbsp;• Thông tin đề tài (tên, chủ nhiệm, mục tiêu)<br>&nbsp;&nbsp;&nbsp;• Kinh phí phê duyệt (budgetApproved)<br>&nbsp;&nbsp;&nbsp;• Tổng kinh phí đã giải ngân<br>&nbsp;&nbsp;&nbsp;• Kinh phí còn lại<br>&nbsp;&nbsp;&nbsp;• Lịch sử các đợt giải ngân trước đó<br>&nbsp;&nbsp;&nbsp;• Trạng thái đề tài<br><br>**Bước 3: Khởi tạo đợt giải ngân mới**<br>6. Admin nhấn nút "Tạo giải ngân" trên đề tài đã chọn<br>7. Hệ thống hiển thị dialog/form tạo giải ngân với các trường:<br>&nbsp;&nbsp;&nbsp;• Số tiền giải ngân (amount) - Bắt buộc<br>&nbsp;&nbsp;&nbsp;• Ngày giải ngân (disbursedAt) - Mặc định là ngày hiện tại<br>&nbsp;&nbsp;&nbsp;• Số chứng từ (voucherNo) - Tùy chọn<br>&nbsp;&nbsp;&nbsp;• File chứng từ (voucherFileUrl) - Tùy chọn, upload PDF/Word<br>&nbsp;&nbsp;&nbsp;• Ghi chú - Tùy chọn<br>8. Hệ thống hiển thị thông tin nhắc nhở:<br>&nbsp;&nbsp;&nbsp;• Kinh phí phê duyệt: [budgetApproved]<br>&nbsp;&nbsp;&nbsp;• Đã giải ngân: [totalDisbursed]<br>&nbsp;&nbsp;&nbsp;• Còn lại: [remainingBudget]<br><br>**Bước 4: Nhập thông tin giải ngân**<br>9. Admin nhập số tiền giải ngân<br>10. Hệ thống validate real-time:<br>&nbsp;&nbsp;&nbsp;• Số tiền phải > 0<br>&nbsp;&nbsp;&nbsp;• Số tiền không được vượt quá kinh phí còn lại<br>11. Admin chọn ngày giải ngân<br>12. Admin nhập số chứng từ (khuyến nghị)<br>13. Admin upload file chứng từ (khuyến nghị)<br>14. Admin có thể nhập ghi chú bổ sung<br><br>**Bước 5: Xác nhận giải ngân**<br>15. Admin nhấn nút "Xác nhận giải ngân"<br>16. Hệ thống hiển thị dialog xác nhận với tổng kết thông tin<br>17. Admin xem lại và nhấn "Đồng ý"<br>18. Hệ thống gọi API tạo giải ngân với payload:<br>&nbsp;&nbsp;&nbsp;• projectId<br>&nbsp;&nbsp;&nbsp;• amount<br>&nbsp;&nbsp;&nbsp;• disbursedAt<br>&nbsp;&nbsp;&nbsp;• voucherNo (nếu có)<br>&nbsp;&nbsp;&nbsp;• voucherFileUrl (nếu có)<br>19. Hệ thống kiểm tra điều kiện nghiệp vụ:<br>&nbsp;&nbsp;&nbsp;• Đề tài còn đang thực hiện<br>&nbsp;&nbsp;&nbsp;• Kinh phí còn lại >= amount<br>&nbsp;&nbsp;&nbsp;• Đề tài không bị đình chỉ kinh phí<br>20. Hệ thống tạo bản ghi FundingDisbursement<br>21. Hệ thống tạo Notification gửi cho chủ nhiệm đề tài<br>22. Hệ thống hiển thị toast "Đã tạo đợt giải ngân thành công"<br>23. Hệ thống đóng dialog và refresh danh sách<br>24. Cập nhật lại thông tin giải ngân của đề tài |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Xem lịch sử giải ngân của đề tài**<br>1. Admin nhấn vào tab "Lịch sử giải ngân" trên đề tài<br>2. Hệ thống hiển thị danh sách các đợt giải ngân:<br>&nbsp;&nbsp;&nbsp;• Số tiền từng đợt<br>&nbsp;&nbsp;&nbsp;• Ngày giải ngân<br>&nbsp;&nbsp;&nbsp;• Số chứng từ<br>&nbsp;&nbsp;&nbsp;• File chứng từ (link tải)<br>&nbsp;&nbsp;&nbsp;• Người tạo<br>&nbsp;&nbsp;&nbsp;• Thời gian tạo<br>3. Admin có thể tải file chứng từ<br><br>**A2. Sửa thông tin giải ngân**<br>1. Admin nhấn nút "Sửa" trên đợt giải ngân<br>2. Hệ thống hiển thị form với thông tin hiện tại<br>3. Admin chỉnh sửa thông tin cần thiết<br>4. Admin nhấn "Cập nhật"<br>5. Hệ thống validate và cập nhật bản ghi<br>6. Hệ thống ghi nhận lịch sử chỉnh sửa<br><br>**A3. Xóa đợt giải ngân**<br>1. Admin nhấn nút "Xóa" trên đợt giải ngân<br>2. Hệ thống hiển thị dialog xác nhận xóa<br>3. Admin nhập lý do xóa (bắt buộc)<br>4. Admin nhấn "Đồng ý xóa"<br>5. Hệ thống xóa mềm bản ghi FundingDisbursement<br>6. Hệ thống tạo Notification gửi cho chủ nhiệm đề tài<br>7. Cập nhật lại tổng giải ngân của đề tài<br><br>**A4. Lọc đề tài theo trạng thái giải ngân**<br>1. Admin chọn bộ lọc "Trạng thái giải ngân"<br>2. Các tùy chọn:<br>&nbsp;&nbsp;&nbsp;• Chưa giải ngân: Đề tài có budgetApproved > 0 và totalDisbursed = 0<br>&nbsp;&nbsp;&nbsp;• Đang giải ngân: Đề tài có 0 < totalDisbursed < budgetApproved<br>&nbsp;&nbsp;&nbsp;• Đã giải ngân hết: Đề tài có totalDisbursed >= budgetApproved<br>3. Hệ thống lọc và hiển thị kết quả<br><br>**A5. Giải ngân nhiều đợt cho một đề tài**<br>1. Đề tài có kinh phí phê duyệt lớn (VD: 100 triệu)<br>2. Admin tạo đợt giải ngân thứ nhất (VD: 30 triệu)<br>3. Sau một thời gian, Admin tạo đợt giải ngân thứ hai (VD: 40 triệu)<br>4. Hệ thống tính tổng: 70 triệu đã giải ngân, 30 triệu còn lại<br>5. Admin tiếp tục tạo đợt giải ngân cho phần còn lại<br><br>**A6. Xuất báo cáo giải ngân**<br>1. Admin nhấn nút "Xuất báo cáo"<br>2. Chọn khoảng thời gian<br>3. Chọn khoa/đơn vị (hoặc tất cả)<br>4. Hệ thống xuất file Excel/PDF với thông tin:<br>&nbsp;&nbsp;&nbsp;• Danh sách đề tài<br>&nbsp;&nbsp;&nbsp;• Tổng kinh phí phê duyệt<br>&nbsp;&nbsp;&nbsp;• Tổng đã giải ngân<br>&nbsp;&nbsp;&nbsp;• Chi tiết từng đợt giải ngân |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Không có đề tài đủ điều kiện giải ngân**<br>1. Admin truy cập trang quản lý giải ngân<br>2. Hệ thống không tìm thấy đề tài nào đang thực hiện và có kinh phí<br>3. Hệ thống hiển thị thông báo "Không có đề tài nào đủ điều kiện giải ngân"<br>4. Hệ thống gợi ý: "Vui lòng kiểm tra lại các đề tài đã được phê duyệt"<br><br>**E2. Số tiền giải ngân vượt quá kinh phí còn lại**<br>1. Admin nhập số tiền giải ngân<br>2. Số tiền nhập > kinh phí còn lại<br>3. Hệ thống hiển thị lỗi real-time dưới ô input<br>4. Nút "Xác nhận" bị vô hiệu hóa<br>5. Admin cần giảm số tiền xuống mức hợp lệ<br><br>**E3. Đề tài bị đình chỉ kinh phí**<br>1. Admin chọn đề tài có budgetSuspended = true<br>2. Hệ thống hiển thị cảnh báo: "Đề tài này đã bị đình chỉ kinh phí"<br>3. Nút "Tạo giải ngân" bị vô hiệu hóa<br>4. Admin cần liên hệ bộ phận phụ trách để gỡ đình chỉ<br><br>**E4. Lỗi khi upload file chứng từ**<br>1. Admin upload file chứng từ<br>2. File có kích thước quá lớn (> 10MB)<br>3. Hoặc định dạng không hỗ trợ<br>4. Hệ thống hiển thị lỗi "File không hợp lệ"<br>5. Admin cần chọn file khác hoặc bỏ qua<br><br>**E5. Lỗi kết nối khi tạo giải ngân**<br>1. Admin nhấn "Xác nhận giải ngân"<br>2. Hệ thống gọi API nhưng gặp lỗi network/server<br>3. Hệ thống hiển thị toast lỗi "Lỗi khi tạo giải ngân"<br>4. Dialog vẫn mở, Admin có thể thử lại<br>5. Không có bản ghi nào được tạo<br><br>**E6. Đề tài đã thay đổi trạng thái**<br>1. Admin đang xem đề tài A<br>2. Đề tài A được nghiệm thu/chuyển trạng thái bởi người khác<br>3. Admin nhấn "Tạo giải ngân"<br>4. Hệ thống kiểm tra và phát hiện đề tài không còn IN_PROGRESS<br>5. Hệ thống hiển thị lỗi "Đề tài không còn ở trạng thái thực hiện"<br>6. Hệ thống tự động refresh danh sách<br><br>**E7. Phiên đăng nhập hết hạn**<br>1. Admin đang nhập thông tin giải ngân<br>2. Phiên làm việc hết hạn<br>3. Admin nhấn "Xác nhận"<br>4. Hệ thống trả về lỗi 401 Unauthorized<br>5. Hệ thống chuyển hướng về trang đăng nhập<br>6. Admin cần đăng nhập lại<br><br>**E8. Đã giải ngân hết kinh phí**<br>1. Admin chọn đề tài đã giải ngân hết 100% kinh phí<br>2. Nút "Tạo giải ngân" bị vô hiệu hóa<br>3. Hiển thị thông báo: "Đề tài đã giải ngân hết kinh phí"<br>4. Admin chỉ có thể xem lịch sử giải ngân |

## Sơ đồ Use Case

Xem file: `uml/uc/admin/disbursement-usecase.plantuml`

## Các bảng liên quan trong Database

1. **FundingDisbursement** - Lưu thông tin các đợt giải ngân
   - `id`: Mã định danh duy nhất
   - `projectId`: Đề tài nhận kinh phí
   - `amount`: Số tiền giải ngân
   - `disbursedAt`: Thời gian giải ngân
   - `voucherNo`: Số chứng từ
   - `voucherFileUrl`: Đường dẫn file chứng từ
   - `createdAt`: Thời gian tạo bản ghi

2. **Project** - Thông tin đề tài
   - `budgetApproved`: Kinh phí được phê duyệt
   - `budgetSuspended`: Trạng thái đình chỉ kinh phí
   - `status`: Trạng thái đề tài (phải là IN_PROGRESS)

3. **User** - Thông tin Admin và chủ nhiệm đề tài

4. **Notification** - Thông báo gửi cho chủ nhiệm đề tài

## Quy tắc nghiệp vụ

1. Chỉ Admin (Phòng QLKH) mới có quyền tạo giải ngân kinh phí
2. Chỉ có thể giải ngân cho đề tài ở trạng thái IN_PROGRESS (Đang thực hiện)
3. Đề tài bị đình chỉ kinh phí (budgetSuspended = true) không được giải ngân
4. Tổng số tiền giải ngân không được vượt quá kinh phí phê duyệt (budgetApproved)
5. Mỗi đợt giải ngân phải có số tiền > 0
6. Khuyến nghị đính kèm chứng từ (voucherNo, voucherFileUrl) cho mỗi đợt giải ngân
7. Khi tạo giải ngân, hệ thống tự động gửi thông báo cho chủ nhiệm đề tài
8. Có thể tạo nhiều đợt giải ngân cho một đề tài (giải ngân theo giai đoạn)
9. Việc xóa giải ngân cần có lý do và được ghi nhận trong hệ thống
10. Hệ thống tự động tính toán tổng đã giải ngân và còn lại theo thời gian thực

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/disbursements` - Lấy danh sách đợt giải ngân
  - `GET /api/disbursements/:id` - Chi tiết một đợt giải ngân
  - `POST /api/projects/:id/disbursements` - Tạo giải ngân mới
  - `PUT /api/disbursements/:id` - Cập nhật giải ngân
  - `DELETE /api/disbursements/:id` - Xóa giải ngân
  - `GET /api/projects/:id/disbursements` - Lịch sử giải ngân của đề tài
- **Validation**: 
  - amount > 0
  - amount <= budgetApproved - totalDisbursed
  - Đề tài phải ở trạng thái IN_PROGRESS
  - budgetSuspended = false
- **State Management**: TanStack Query với mutations `useCreateDisbursement`, `useUpdateDisbursement`, `useDeleteDisbursement`
- **UI Components**: Shadcn UI (Dialog, Form, Input, DatePicker, Upload, Table, Badge)
- **Toast Notification**: Sử dụng thư viện `sonner`
- **File Upload**: Upload chứng từ PDF/Word lên server, lưu URL vào voucherFileUrl

## So sánh với Use Case "Phê duyệt đợt đăng ký"

| Tiêu chí | Phê duyệt đợt đăng ký | Giải ngân kinh phí |
|----------|----------------------|-------------------|
| **Actor** | Admin | Admin |
| **Mục đích** | Xét duyệt đợt đăng ký | Cấp phát kinh phí cho đề tài |
| **Đối tượng** | CallRound | Project |
| **Trạng thái đối tượng** | PENDING_APPROVAL | IN_PROGRESS |
| **Trạng thái sau** | APPROVED hoặc REJECTED | Tạo bản ghi FundingDisbursement |
| **Số lần thực hiện** | Một lần duy nhất | Có thể nhiều lần (giải ngân từng giai đoạn) |
| **File đính kèm** | Không bắt buộc | Khuyến nghị có chứng từ |
| **Thông báo** | Gửi cho Trưởng Khoa | Gửi cho Chủ nhiệm đề tài |
| **Kiểm soát** | Chỉ duyệt hoặc từ chối | Kiểm soát số tiền, không vượt ngân sách |

## Workflow tổng thể

```
[Đề tài: APPROVED]
    ↓ Phê duyệt đề tài
[Đề tài: IN_PROGRESS]
    ↓ Chủ nhiệm bắt đầu thực hiện
[Admin: Kiểm tra đề tài đủ điều kiện]
    ├─→ budgetApproved > 0
    ├─→ budgetSuspended = false
    └─→ status = IN_PROGRESS
    ↓
[Tạo đợt giải ngân]
    ├─→ Nhập số tiền (amount)
    ├─→ Chọn ngày (disbursedAt)
    ├─→ Nhập chứng từ (voucherNo, voucherFileUrl)
    └─→ Xác nhận
    ↓
[FundingDisbursement được tạo]
    ↓ Gửi thông báo
[Chủ nhiệm đề tài nhận thông báo]
    ↓
[Lịch sử giải ngân được cập nhật]
    ↓ Tổng giải ngân >= budgetApproved?
    ├─→ Có: Đã giải ngân hết
    └─→ Không: Có thể tiếp tục giải ngân
```

## Mối quan hệ với các Use Case khác

1. **Phê duyệt đề tài**: Đề tài phải được phê duyệt (APPROVED → IN_PROGRESS) mới có thể giải ngân
2. **Theo dõi tiến độ**: Đề tài đang thực hiện cần báo cáo tiến độ, có thể liên quan đến việc giải ngân theo giai đoạn
3. **Đình chỉ kinh phí**: Nếu đề tài vi phạm, Admin có thể đình chỉ kinh phí (budgetSuspended = true), lúc đó không thể giải ngân
4. **Nghiệm thu đề tài**: Sau khi nghiệm thu, đề tài chuyển sang COMPLETED, không thể giải ngân thêm