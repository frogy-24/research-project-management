# MÔ TẢ USE CASE: PHÊ DUYỆT ĐỢT ĐĂNG KÝ

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Phê duyệt đợt đăng ký |
| 2 | **Tác nhân** | Admin (Phòng Quản lý Khoa học) |
| 3 | **Mô tả** | Use-case này cho phép Admin xem xét và phê duyệt/từ chối các đợt đăng ký đề tài nghiên cứu do Trưởng Khoa tạo. Admin có thể xem chi tiết thông tin đợt đăng ký, lọc theo trạng thái, và đưa ra quyết định phê duyệt hoặc từ chối kèm ghi chú |
| 4 | **Tiền điều kiện** | 1. Admin đã đăng nhập vào hệ thống<br>2. Admin có quyền phê duyệt đợt đăng ký (role = ADMIN)<br>3. Có ít nhất một đợt đăng ký ở trạng thái PENDING_APPROVAL<br>4. Đợt đăng ký đã được Trưởng Khoa tạo và gửi lên hệ thống |
| 5 | **Hậu điều kiện** | **Khi phê duyệt:**<br>1. Trạng thái đợt đăng ký chuyển từ PENDING_APPROVAL sang APPROVED<br>2. Đợt đăng ký được kích hoạt và hiển thị cho sinh viên/giảng viên<br>3. Sinh viên/Giảng viên có thể bắt đầu đăng ký đề tài<br>4. Trưởng Khoa nhận được thông báo đợt đăng ký đã được phê duyệt<br>5. Ghi chú phê duyệt (nếu có) được lưu vào hệ thống<br><br>**Khi từ chối:**<br>1. Trạng thái đợt đăng ký chuyển từ PENDING_APPROVAL sang REJECTED<br>2. Đợt đăng ký không được hiển thị cho sinh viên/giảng viên<br>3. Trưởng Khoa nhận được thông báo đợt đăng ký bị từ chối<br>4. Lý do từ chối được lưu vào trường approvalNote<br>5. Trưởng Khoa cần tạo đợt đăng ký mới hoặc chỉnh sửa lại |
| 6 | **Luồng sự kiện chính** | **Bước 1: Truy cập trang quản lý đợt đăng ký**<br>1. Admin đăng nhập vào hệ thống<br>2. Admin điều hướng đến trang "Quản lý Đợt Đăng Ký"<br>3. Hệ thống hiển thị danh sách tất cả các đợt đăng ký<br><br>**Bước 2: Lọc đợt đăng ký chờ duyệt**<br>4. Admin chọn bộ lọc "Trạng thái duyệt"<br>5. Admin chọn "Chờ duyệt" (PENDING_APPROVAL)<br>6. Hệ thống hiển thị danh sách các đợt đăng ký đang chờ phê duyệt<br>7. Admin có thể lọc thêm theo khoa nếu cần<br><br>**Bước 3: Xem chi tiết đợt đăng ký**<br>8. Admin nhấn vào một đợt đăng ký cần xem xét<br>9. Hệ thống hiển thị đầy đủ thông tin:<br>&nbsp;&nbsp;&nbsp;• Thông tin cơ bản (tên, mô tả, số lượng đề tài tối đa)<br>&nbsp;&nbsp;&nbsp;• Thời gian đăng ký (ngày bắt đầu, ngày kết thúc)<br>&nbsp;&nbsp;&nbsp;• Thời gian thực hiện đề tài<br>&nbsp;&nbsp;&nbsp;• Yêu cầu và điều kiện đăng ký<br>&nbsp;&nbsp;&nbsp;• Hướng dẫn đăng ký<br>&nbsp;&nbsp;&nbsp;• Biểu mẫu báo cáo tiến độ<br>&nbsp;&nbsp;&nbsp;• Danh sách giảng viên hướng dẫn<br>&nbsp;&nbsp;&nbsp;• Danh sách thành viên hội đồng<br>&nbsp;&nbsp;&nbsp;• Phạm vi tổ chức (khoa, ngành, lớp)<br>&nbsp;&nbsp;&nbsp;• Thông tin người tạo (Trưởng Khoa nào)<br>10. Admin xem xét tính hợp lệ và đầy đủ của thông tin<br><br>**Bước 4: Đưa ra quyết định phê duyệt**<br>11. Admin nhấn nút "Duyệt" bên cạnh đợt đăng ký<br>12. Hệ thống hiển thị dialog xác nhận phê duyệt<br>13. Admin có thể nhập ghi chú phê duyệt (tùy chọn)<br>14. Admin nhấn nút "Phê duyệt" để xác nhận<br>15. Hệ thống gọi API phê duyệt với payload: { id, note }<br>16. Hệ thống cập nhật trạng thái đợt đăng ký thành APPROVED<br>17. Hệ thống lưu ghi chú vào trường approvalNote<br>18. Hệ thống lưu thông tin người phê duyệt (approvedBy, approvedAt)<br>19. Hệ thống tạo thông báo gửi cho Trưởng Khoa<br>20. Hệ thống hiển thị toast "Đã phê duyệt đợt đăng ký"<br>21. Hệ thống đóng dialog và refresh danh sách<br>22. Badge trạng thái chuyển từ "Chờ duyệt" (vàng) sang "Đã duyệt" (xanh)<br><br>**Bước 5 (Luồng thay thế): Từ chối đợt đăng ký**<br>23. Nếu Admin thấy thông tin không hợp lệ, nhấn nút "Từ chối"<br>24. Hệ thống hiển thị dialog xác nhận từ chối<br>25. Admin nhập lý do từ chối (khuyến nghị)<br>26. Admin nhấn nút "Từ chối" để xác nhận<br>27. Hệ thống gọi API từ chối với payload: { id, note }<br>28. Hệ thống cập nhật trạng thái đợt đăng ký thành REJECTED<br>29. Hệ thống lưu lý do từ chối vào trường approvalNote<br>30. Hệ thống tạo thông báo gửi cho Trưởng Khoa kèm lý do<br>31. Hệ thống hiển thị toast "Đã từ chối đợt đăng ký"<br>32. Hệ thống đóng dialog và refresh danh sách<br>33. Badge trạng thái chuyển sang "Bị từ chối" (đỏ) |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Xem lại đợt đã phê duyệt**<br>1. Admin chọn bộ lọc "Đã duyệt"<br>2. Hệ thống hiển thị danh sách các đợt đã được phê duyệt<br>3. Admin có thể xem chi tiết nhưng không thể thay đổi trạng thái<br>4. Nút "Duyệt" và "Từ chối" không hiển thị<br><br>**A2. Xem lại đợt đã từ chối**<br>1. Admin chọn bộ lọc "Bị từ chối"<br>2. Hệ thống hiển thị danh sách các đợt đã bị từ chối<br>3. Admin có thể xem lý do từ chối trong trường approvalNote<br>4. Nút "Duyệt" và "Từ chối" không hiển thị<br><br>**A3. Lọc theo khoa**<br>1. Admin chọn bộ lọc "Khoa"<br>2. Admin chọn một khoa cụ thể<br>3. Hệ thống chỉ hiển thị các đợt đăng ký thuộc khoa đó<br>4. Admin có thể kết hợp với bộ lọc trạng thái<br><br>**A4. Xóa bộ lọc**<br>1. Admin nhấn nút "Xóa bộ lọc"<br>2. Hệ thống reset tất cả bộ lọc về "Tất cả"<br>3. Hiển thị lại toàn bộ danh sách đợt đăng ký<br><br>**A5. Phê duyệt không có ghi chú**<br>1. Admin bỏ qua trường ghi chú trong dialog<br>2. Hệ thống vẫn thực hiện phê duyệt bình thường<br>3. Trường approvalNote được lưu là null<br><br>**A6. Xem đợt do đơn vị khác tạo**<br>1. Admin mở chi tiết đợt có createdByRole khác ADMIN<br>2. Hệ thống hiển thị banner "Đợt do đơn vị khác khởi tạo"<br>3. Hiển thị nguồn tạo (Trưởng khoa, Ban giám hiệu, v.v.)<br>4. Phạm vi tổ chức hiển thị ở chế độ xem (read-only)<br>5. Admin vẫn có thể phê duyệt/từ chối bình thường |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Không có đợt đăng ký chờ duyệt**<br>1. Admin chọn bộ lọc "Chờ duyệt"<br>2. Hệ thống không tìm thấy đợt nào có trạng thái PENDING_APPROVAL<br>3. Hệ thống hiển thị "Không có dữ liệu phù hợp bộ lọc"<br>4. Admin có thể xóa bộ lọc để xem tất cả<br><br>**E2. Lỗi khi phê duyệt**<br>1. Admin nhấn nút "Phê duyệt"<br>2. Hệ thống gọi API nhưng gặp lỗi (500, network error)<br>3. Hệ thống hiển thị toast lỗi "Lỗi khi phê duyệt"<br>4. Dialog vẫn mở, Admin có thể thử lại<br>5. Trạng thái đợt đăng ký không thay đổi<br><br>**E3. Lỗi khi từ chối**<br>1. Admin nhấn nút "Từ chối"<br>2. Hệ thống gọi API nhưng gặp lỗi<br>3. Hệ thống hiển thị toast lỗi "Lỗi khi từ chối"<br>4. Dialog vẫn mở, Admin có thể thử lại<br>5. Trạng thái đợt đăng ký không thay đổi<br><br>**E4. Đợt đăng ký đã bị xóa**<br>1. Admin đang xem danh sách đợt chờ duyệt<br>2. Trưởng Khoa xóa đợt đăng ký trong lúc đó<br>3. Admin nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Hệ thống trả về lỗi 404 Not Found<br>5. Hệ thống hiển thị toast "Đợt đăng ký không tồn tại"<br>6. Hệ thống tự động refresh danh sách<br><br>**E5. Đợt đăng ký đã được duyệt bởi Admin khác**<br>1. Admin A và Admin B cùng xem một đợt chờ duyệt<br>2. Admin A phê duyệt trước<br>3. Admin B cố gắng phê duyệt sau<br>4. Hệ thống kiểm tra trạng thái hiện tại<br>5. Hệ thống trả về lỗi "Đợt đăng ký đã được xử lý"<br>6. Hệ thống tự động refresh danh sách<br><br>**E6. Phiên đăng nhập hết hạn**<br>1. Admin đang xem chi tiết đợt đăng ký<br>2. Phiên làm việc hết hạn<br>3. Admin nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Hệ thống trả về lỗi 401 Unauthorized<br>5. Hệ thống chuyển hướng về trang đăng nhập<br>6. Admin cần đăng nhập lại để tiếp tục<br><br>**E7. Không có quyền phê duyệt**<br>1. Người dùng không phải Admin cố truy cập trang<br>2. Middleware kiểm tra role<br>3. Hệ thống chặn truy cập và chuyển hướng về trang chủ<br>4. Hiển thị thông báo "Bạn không có quyền truy cập" |

## Sơ đồ Use Case

Xem file: `uml/call-round-approval-usecase.plantuml`

## Các bảng liên quan trong Database

1. **CallRound** - Lưu thông tin đợt đăng ký và trạng thái phê duyệt
   - `approvalStatus`: PENDING_APPROVAL | APPROVED | REJECTED
   - `approvalNote`: Ghi chú phê duyệt/từ chối
   - `approvedBy`: ID của Admin phê duyệt
   - `approvedAt`: Thời gian phê duyệt
   - `createdByRole`: Vai trò người tạo (DEAN, ADMIN, v.v.)

2. **User** - Thông tin Admin và Trưởng Khoa

3. **Notification** - Thông báo gửi cho Trưởng Khoa

## Quy tắc nghiệp vụ

1. Chỉ Admin (Phòng QLKH) mới có quyền phê duyệt/từ chối đợt đăng ký
2. Chỉ có thể phê duyệt/từ chối đợt đăng ký ở trạng thái PENDING_APPROVAL
3. Đợt đã được phê duyệt (APPROVED) hoặc từ chối (REJECTED) không thể thay đổi trạng thái
4. Khi phê duyệt, đợt đăng ký tự động được kích hoạt (isActive = true)
5. Khi từ chối, Trưởng Khoa cần tạo đợt mới hoặc chỉnh sửa lại
6. Ghi chú phê duyệt/từ chối là tùy chọn nhưng khuyến nghị điền khi từ chối
7. Hệ thống tự động gửi thông báo cho Trưởng Khoa sau khi phê duyệt/từ chối
8. Admin có thể xem lại lịch sử các đợt đã phê duyệt/từ chối
9. Bộ lọc giúp Admin quản lý hiệu quả khi có nhiều đợt đăng ký
10. Đợt đăng ký do Trưởng Khoa tạo sẽ có createdByRole = DEAN

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `POST /api/call-rounds/{id}/approve` - Phê duyệt
  - `POST /api/call-rounds/{id}/reject` - Từ chối
  - `GET /api/call-rounds` - Lấy danh sách (có filter)
- **Validation**: Kiểm tra trạng thái hiện tại trước khi phê duyệt/từ chối
- **State Management**: TanStack Query với mutations `useApproveCallRound`, `useRejectCallRound`
- **UI Components**: Shadcn UI (Dialog, Badge, Button, Select, Textarea, Table)
- **Toast Notification**: Sử dụng thư viện `sonner`
- **Real-time**: Tự động refresh danh sách sau khi phê duyệt/từ chối

## So sánh với Use Case "Tạo đợt đăng ký"

| Tiêu chí | Tạo đợt đăng ký | Phê duyệt đợt đăng ký |
|----------|-----------------|------------------------|
| **Actor** | Trưởng Khoa | Admin |
| **Mục đích** | Khởi tạo đợt đăng ký mới | Xét duyệt đợt đã tạo |
| **Trạng thái ban đầu** | Không có | PENDING_APPROVAL |
| **Trạng thái sau** | PENDING_APPROVAL | APPROVED hoặc REJECTED |
| **Quyền hạn** | Chỉ tạo cho khoa của mình | Duyệt tất cả các khoa |
| **Thông báo** | Gửi cho Admin | Gửi cho Trưởng Khoa |
| **Có thể chỉnh sửa** | Có (khi chờ duyệt) | Không (chỉ xem) |

## Workflow tổng thể

```
[Trưởng Khoa] 
    ↓ Tạo đợt đăng ký
[Đợt đăng ký: PENDING_APPROVAL]
    ↓ Gửi thông báo
[Admin]
    ↓ Xem xét
    ├─→ Phê duyệt → [APPROVED] → Sinh viên có thể đăng ký
    └─→ Từ chối → [REJECTED] → Trưởng Khoa tạo lại
```
