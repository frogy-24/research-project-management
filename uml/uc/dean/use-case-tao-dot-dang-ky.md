# MÔ TẢ USE CASE: TẠO ĐỢT ĐĂNG KÝ

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Tạo đợt đăng ký |
| 2 | **Tác nhân** | Trưởng Khoa (Dean) |
| 3 | **Mô tả** | Use-case này cho phép Trưởng Khoa tạo đợt đăng ký đề tài nghiên cứu mới cho khoa, bao gồm thiết lập thông tin cơ bản, thời gian, yêu cầu và chỉ định nhân sự tham gia |
| 4 | **Tiền điều kiện** | 1. Trưởng Khoa đã đăng nhập vào hệ thống<br>2. Trưởng Khoa có quyền tạo đợt đăng ký (role = DEAN)<br>3. Hệ thống có danh sách giảng viên thuộc khoa<br>4. Hệ thống có sẵn các biểu mẫu báo cáo tiến độ (tùy chọn) |
| 5 | **Hậu điều kiện** | 1. Đợt đăng ký mới được tạo với trạng thái PENDING_APPROVAL<br>2. Thông tin đợt đăng ký được lưu vào cơ sở dữ liệu<br>3. Danh sách giảng viên hướng dẫn và thành viên hội đồng được liên kết với đợt đăng ký<br>4. Admin nhận được thông báo có đợt đăng ký mới cần phê duyệt<br>5. Hệ thống hiển thị thông báo thành công cho Trưởng Khoa |
| 6 | **Luồng sự kiện chính** | **Bước 1: Mở form tạo đợt đăng ký**<br>1. Trưởng Khoa truy cập trang "Quản lý Đợt Đăng Ký"<br>2. Trưởng Khoa nhấn nút "Thêm đợt đăng ký"<br>3. Hệ thống hiển thị form tạo đợt đăng ký mới<br><br>**Bước 2: Nhập thông tin cơ bản**<br>4. Trưởng Khoa nhập tên đợt đăng ký (bắt buộc)<br>5. Trưởng Khoa nhập mô tả chi tiết (tùy chọn)<br>6. Trưởng Khoa nhập số lượng đề tài tối đa (tùy chọn)<br><br>**Bước 3: Thiết lập thời gian**<br>7. Trưởng Khoa chọn ngày bắt đầu đăng ký (bắt buộc)<br>8. Trưởng Khoa chọn ngày kết thúc đăng ký (bắt buộc)<br>9. Trưởng Khoa chọn ngày bắt đầu thực hiện đề tài (tùy chọn)<br>10. Trưởng Khoa chọn ngày kết thúc thực hiện đề tài (tùy chọn)<br>11. Hệ thống kiểm tra ngày kết thúc phải sau ngày bắt đầu<br><br>**Bước 4: Thiết lập yêu cầu & biểu mẫu**<br>12. Trưởng Khoa chọn đối tượng áp dụng (Sinh viên/Giảng viên/Cả hai)<br>13. Trưởng Khoa nhập yêu cầu và điều kiện đăng ký (tùy chọn)<br>14. Trưởng Khoa chọn biểu mẫu báo cáo tiến độ từ danh sách có sẵn (tùy chọn)<br><br>**Bước 5: Chỉ định giảng viên hướng dẫn**<br>15. Hệ thống hiển thị danh sách giảng viên thuộc khoa<br>16. Trưởng Khoa chọn các giảng viên có thể hướng dẫn đề tài<br>17. Trưởng Khoa có thể sử dụng nút "Chọn tất cả" để chọn toàn bộ giảng viên<br><br>**Bước 6: Chỉ định thành viên hội đồng**<br>18. Hệ thống hiển thị danh sách giảng viên thuộc khoa<br>19. Trưởng Khoa chọn các giảng viên tham gia hội đồng chấm điểm/nghiệm thu<br>20. Trưởng Khoa có thể sử dụng nút "Chọn tất cả" để chọn toàn bộ giảng viên<br><br>**Bước 7: Gửi đợt đăng ký**<br>21. Trưởng Khoa nhấn nút "Tạo mới"<br>22. Hệ thống validate toàn bộ dữ liệu đầu vào<br>23. Hệ thống tạo đợt đăng ký với trạng thái PENDING_APPROVAL<br>24. Hệ thống lưu thông tin vào bảng CallRound<br>25. Hệ thống liên kết giảng viên hướng dẫn vào bảng CallRoundInstructor<br>26. Hệ thống liên kết thành viên hội đồng vào bảng CallRoundCouncilMember<br>27. Hệ thống gửi thông báo đến Admin<br>28. Hệ thống hiển thị toast "Tạo đợt đăng ký thành công! Đang chờ Admin phê duyệt"<br>29. Hệ thống đóng form và refresh danh sách đợt đăng ký |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Chỉnh sửa đợt đăng ký đang chờ duyệt**<br>1. Trưởng Khoa chọn đợt đăng ký có trạng thái PENDING_APPROVAL<br>2. Trưởng Khoa nhấn nút "Chỉnh sửa"<br>3. Hệ thống hiển thị form với dữ liệu hiện tại<br>4. Trưởng Khoa thay đổi thông tin cần thiết<br>5. Trưởng Khoa nhấn nút "Cập nhật"<br>6. Hệ thống cập nhật thông tin đợt đăng ký<br>7. Đợt đăng ký vẫn giữ trạng thái PENDING_APPROVAL<br><br>**A2. Không chọn biểu mẫu báo cáo**<br>1. Trưởng Khoa chọn "Không sử dụng biểu mẫu" trong dropdown<br>2. Hệ thống lưu templateId = null<br>3. Sinh viên sẽ không có biểu mẫu hướng dẫn khi báo cáo tiến độ<br><br>**A3. Không giới hạn số lượng đề tài**<br>1. Trưởng Khoa để trống trường "Số lượng đề tài tối đa"<br>2. Hệ thống lưu maxProjects = null<br>3. Không có giới hạn số lượng đề tài có thể đăng ký |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Thiếu thông tin bắt buộc**<br>1. Trưởng Khoa bỏ trống tên đợt đăng ký hoặc ngày đăng ký<br>2. Hệ thống hiển thị thông báo lỗi validation<br>3. Hệ thống highlight các trường bị lỗi<br>4. Trưởng Khoa phải nhập đầy đủ thông tin trước khi tiếp tục<br><br>**E2. Ngày kết thúc trước ngày bắt đầu**<br>1. Trưởng Khoa chọn ngày kết thúc đăng ký trước ngày bắt đầu<br>2. Hệ thống hiển thị lỗi "Ngày kết thúc đăng ký phải sau ngày bắt đầu"<br>3. Trưởng Khoa phải chọn lại ngày hợp lệ<br><br>**E3. Không có giảng viên trong khoa**<br>1. Hệ thống không tìm thấy giảng viên nào thuộc khoa<br>2. Hệ thống hiển thị "Chưa có giảng viên nào trong khoa"<br>3. Trưởng Khoa vẫn có thể tạo đợt đăng ký nhưng không có giảng viên hướng dẫn<br><br>**E4. Lỗi kết nối cơ sở dữ liệu**<br>1. Hệ thống gặp lỗi khi lưu dữ liệu vào database<br>2. Hệ thống hiển thị toast lỗi "Có lỗi xảy ra!"<br>3. Dữ liệu không được lưu<br>4. Trưởng Khoa được khuyên thử lại sau<br><br>**E5. Chỉnh sửa đợt đã được duyệt**<br>1. Trưởng Khoa cố gắng chỉnh sửa đợt có trạng thái APPROVED hoặc REJECTED<br>2. Hệ thống hiển thị toast "Chỉ có thể chỉnh sửa đợt đăng ký khi đang ở trạng thái chờ duyệt"<br>3. Form chỉnh sửa không được mở<br><br>**E6. Phiên đăng nhập hết hạn**<br>1. Phiên làm việc của Trưởng Khoa hết hạn trong khi đang điền form<br>2. Khi submit, hệ thống trả về lỗi 401 Unauthorized<br>3. Hệ thống chuyển hướng về trang đăng nhập<br>4. Dữ liệu đã nhập bị mất |

## Sơ đồ Use Case

Xem file: `call-round-usecase-detailed.plantuml`

## Các bảng liên quan trong Database

1. **CallRound** - Lưu thông tin đợt đăng ký
2. **CallRoundInstructor** - Liên kết giảng viên hướng dẫn với đợt đăng ký
3. **CallRoundCouncilMember** - Liên kết thành viên hội đồng với đợt đăng ký
4. **ProgressTemplate** - Biểu mẫu báo cáo tiến độ
5. **User** - Thông tin giảng viên và Trưởng Khoa

## Quy tắc nghiệp vụ

1. Chỉ Trưởng Khoa mới có quyền tạo đợt đăng ký cho khoa của mình
2. Đợt đăng ký mới luôn có trạng thái PENDING_APPROVAL
3. Chỉ có thể chỉnh sửa đợt đăng ký khi đang ở trạng thái PENDING_APPROVAL
4. Ngày kết thúc phải sau ngày bắt đầu (cả đăng ký và thực hiện)
5. Giảng viên hướng dẫn và thành viên hội đồng phải thuộc cùng khoa với Trưởng Khoa
6. Một giảng viên có thể vừa là hướng dẫn viên vừa là thành viên hội đồng
7. Đợt đăng ký cần được Admin phê duyệt trước khi sinh viên có thể đăng ký đề tài

## Ghi chú kỹ thuật

- **API Endpoint**: `POST /api/call-rounds`
- **Validation**: Sử dụng Zod schema `createCallRoundSchema`
- **State Management**: TanStack Query với mutation `useCreateCallRound`
- **UI Components**: Shadcn UI (Dialog, Form, Input, Select, Checkbox, ScrollArea)
- **Toast Notification**: Sử dụng thư viện `sonner`