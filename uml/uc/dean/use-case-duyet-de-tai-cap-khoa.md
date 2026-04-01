# MÔ TẢ USE CASE: DUYỆT ĐỀ TÀI CẤP KHOA

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Duyệt đề tài cấp Khoa |
| 2 | **Tác nhân** | Trưởng Khoa (Dean) |
| 3 | **Mô tả** | Use-case này cho phép Trưởng Khoa xem xét và phê duyệt/từ chối các thuyết minh đề tài nghiên cứu do sinh viên/giảng viên thuộc khoa đăng ký. Trưởng Khoa có thể lọc, tìm kiếm, xem chi tiết đề tài và đưa ra quyết định phê duyệt sau khi giảng viên hướng dẫn đã chấp nhận |
| 4 | **Tiền điều kiện** | 1. Trưởng Khoa đã đăng nhập vào hệ thống<br>2. Trưởng Khoa có quyền duyệt đề tài (role = DEAN)<br>3. Có ít nhất một đề tài ở trạng thái facultyStatus = PENDING<br>4. Đề tài đã được sinh viên/giảng viên đăng ký<br>5. Giảng viên hướng dẫn đã chấp nhận (instructorStatus = ACCEPTED) |
| 5 | **Hậu điều kiện** | **Khi phê duyệt:**<br>1. Trạng thái đề tài chuyển từ facultyStatus = PENDING sang APPROVED<br>2. Đề tài được chuyển sang giai đoạn thực hiện<br>3. Sinh viên/Giảng viên nhận được thông báo đề tài đã được phê duyệt<br>4. Đề tài có thể bắt đầu báo cáo tiến độ<br>5. Hệ thống ghi lại thông tin người phê duyệt và thời gian<br><br>**Khi từ chối:**<br>1. Trạng thái đề tài chuyển từ facultyStatus = PENDING sang REJECTED<br>2. Sinh viên/Giảng viên nhận được thông báo đề tài bị từ chối<br>3. Sinh viên/Giảng viên cần chỉnh sửa lại thuyết minh<br>4. Đề tài không thể chuyển sang giai đoạn thực hiện |
| 6 | **Luồng sự kiện chính** | **Bước 1: Truy cập trang duyệt đề tài**<br>1. Trưởng Khoa đăng nhập vào hệ thống<br>2. Trưởng Khoa điều hướng đến trang "Duyệt đề tài cấp Khoa"<br>3. Hệ thống hiển thị danh sách các đề tài cần duyệt<br>4. Mặc định chỉ hiển thị đề tài có GVHD đã chấp nhận<br><br>**Bước 2: Lọc và tìm kiếm đề tài**<br>5. Trưởng Khoa có thể nhập từ khóa tìm kiếm (tên đề tài hoặc chủ nhiệm)<br>6. Hệ thống tự động debounce (300ms) và tìm kiếm<br>7. Trưởng Khoa có thể chọn bộ lọc "Trạng thái Khoa":<br>&nbsp;&nbsp;&nbsp;• Tất cả trạng thái<br>&nbsp;&nbsp;&nbsp;• Chờ duyệt (PENDING)<br>&nbsp;&nbsp;&nbsp;• Đã duyệt (APPROVED)<br>&nbsp;&nbsp;&nbsp;• Đã từ chối (REJECTED)<br>8. Trưởng Khoa có thể chọn bộ lọc "Đợt đăng ký"<br>9. Hệ thống hiển thị các bộ lọc đang áp dụng dưới dạng Badge<br>10. Hệ thống tự động reset về trang 1 khi thay đổi bộ lọc<br><br>**Bước 3: Xem danh sách đề tài**<br>11. Hệ thống hiển thị bảng danh sách với các cột:<br>&nbsp;&nbsp;&nbsp;• STT<br>&nbsp;&nbsp;&nbsp;• Tên đề tài<br>&nbsp;&nbsp;&nbsp;• Chủ nhiệm (sinh viên/giảng viên)<br>&nbsp;&nbsp;&nbsp;• GV Hướng dẫn (tên + trạng thái)<br>&nbsp;&nbsp;&nbsp;• Trạng thái Khoa (Badge màu)<br>&nbsp;&nbsp;&nbsp;• Hành động (Chi tiết, Duyệt, Từ chối)<br>12. Hệ thống hiển thị thông tin phân trang:<br>&nbsp;&nbsp;&nbsp;• Số lượng hồ sơ hiện tại / tổng số<br>&nbsp;&nbsp;&nbsp;• Trang hiện tại / tổng số trang<br>13. Mỗi trang hiển thị tối đa 10 đề tài<br><br>**Bước 4: Xem chi tiết đề tài**<br>14. Trưởng Khoa nhấn nút "Chi tiết" trên một đề tài<br>15. Hệ thống mở Dialog hiển thị thông tin đầy đủ:<br><br>&nbsp;&nbsp;&nbsp;**Thông tin sinh viên:**<br>&nbsp;&nbsp;&nbsp;• Họ và tên<br>&nbsp;&nbsp;&nbsp;• Mã sinh viên<br>&nbsp;&nbsp;&nbsp;• Email<br>&nbsp;&nbsp;&nbsp;• Khoa<br>&nbsp;&nbsp;&nbsp;• Lớp<br>&nbsp;&nbsp;&nbsp;• Ngành<br><br>&nbsp;&nbsp;&nbsp;**Thông tin giảng viên hướng dẫn:**<br>&nbsp;&nbsp;&nbsp;• Họ và tên<br>&nbsp;&nbsp;&nbsp;• Mã giảng viên<br>&nbsp;&nbsp;&nbsp;• Email<br>&nbsp;&nbsp;&nbsp;• Khoa/Đơn vị<br><br>&nbsp;&nbsp;&nbsp;**Thông tin đề tài:**<br>&nbsp;&nbsp;&nbsp;• Tên đề tài<br>&nbsp;&nbsp;&nbsp;• Đợt đăng ký<br>&nbsp;&nbsp;&nbsp;• Trạng thái phản hồi GVHD (Badge)<br>&nbsp;&nbsp;&nbsp;• Mục tiêu nghiên cứu<br>&nbsp;&nbsp;&nbsp;• Sản phẩm dự kiến<br><br>16. Trưởng Khoa xem xét tính khả thi và chất lượng đề tài<br>17. Trưởng Khoa kiểm tra trạng thái GVHD đã chấp nhận chưa<br><br>**Bước 5: Phê duyệt đề tài**<br>18. Trưởng Khoa nhấn nút "Duyệt" trên đề tài có trạng thái PENDING<br>19. Hệ thống kiểm tra điều kiện:<br>&nbsp;&nbsp;&nbsp;• facultyStatus = PENDING<br>&nbsp;&nbsp;&nbsp;• instructorStatus = ACCEPTED (GVHD đã chấp nhận)<br>20. Nếu GVHD chưa chấp nhận, nút "Duyệt" bị disable<br>21. Hệ thống gọi API: PUT /api/dean/approvals/{id} với { status: 'APPROVED' }<br>22. Hệ thống cập nhật facultyStatus = APPROVED<br>23. Hệ thống tạo thông báo gửi cho sinh viên/giảng viên<br>24. Hệ thống hiển thị toast "Cập nhật trạng thái thành công"<br>25. Hệ thống tự động refresh danh sách<br>26. Badge trạng thái chuyển từ "Chờ duyệt" (vàng) sang "Đã duyệt" (xanh)<br>27. Nút "Duyệt" và "Từ chối" biến mất<br><br>**Bước 6 (Luồng thay thế): Từ chối đề tài**<br>28. Nếu Trưởng Khoa thấy đề tài không đạt yêu cầu, nhấn nút "Từ chối"<br>29. Hệ thống gọi API: PUT /api/dean/approvals/{id} với { status: 'REJECTED' }<br>30. Hệ thống cập nhật facultyStatus = REJECTED<br>31. Hệ thống tạo thông báo gửi cho sinh viên/giảng viên<br>32. Hệ thống hiển thị toast "Cập nhật trạng thái thành công"<br>33. Hệ thống tự động refresh danh sách<br>34. Badge trạng thái chuyển sang "Đã từ chối" (đỏ)<br>35. Nút "Duyệt" và "Từ chối" biến mất |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Xóa bộ lọc**<br>1. Trưởng Khoa nhấn nút "Xóa bộ lọc" hoặc icon X trên Badge<br>2. Hệ thống reset tất cả bộ lọc về mặc định<br>3. Hệ thống reset về trang 1<br>4. Hiển thị lại toàn bộ danh sách đề tài<br><br>**A2. Phân trang**<br>1. Trưởng Khoa nhấn nút "Trang trước" hoặc "Trang sau"<br>2. Hoặc nhấn vào số trang cụ thể (1, 2, 3, 4, 5)<br>3. Hệ thống chuyển sang trang được chọn<br>4. Hệ thống load dữ liệu trang mới từ API<br>5. Bộ lọc hiện tại được giữ nguyên<br><br>**A3. Xem đề tài đã duyệt/từ chối**<br>1. Trưởng Khoa chọn bộ lọc "Đã duyệt" hoặc "Đã từ chối"<br>2. Hệ thống hiển thị danh sách đề tài tương ứng<br>3. Nút "Duyệt" và "Từ chối" không hiển thị<br>4. Chỉ có nút "Chi tiết" để xem thông tin<br><br>**A4. Tìm kiếm theo từ khóa**<br>1. Trưởng Khoa nhập từ khóa vào ô tìm kiếm<br>2. Hệ thống đợi 300ms (debounce)<br>3. Hệ thống tìm kiếm trong tên đề tài và tên chủ nhiệm<br>4. Hiển thị kết quả phù hợp<br>5. Hiển thị Badge "Tìm kiếm: {từ khóa}"<br><br>**A5. Lọc theo đợt đăng ký**<br>1. Trưởng Khoa chọn một đợt đăng ký cụ thể<br>2. Hệ thống chỉ hiển thị đề tài thuộc đợt đó<br>3. Hiển thị Badge "Đợt: {tên đợt}"<br>4. Có thể kết hợp với các bộ lọc khác<br><br>**A6. Không có GVHD**<br>1. Đề tài không có giảng viên hướng dẫn<br>2. Hệ thống hiển thị "Không có" trong cột GVHD<br>3. Nút "Duyệt" vẫn có thể nhấn (không bắt buộc phải có GVHD)<br><br>**A7. GVHD chưa chấp nhận**<br>1. Đề tài có GVHD nhưng instructorStatus = PENDING<br>2. Badge hiển thị "Chờ xác nhận" (màu xám)<br>3. Nút "Duyệt" bị disable<br>4. Tooltip hiển thị "Chờ GVHD chấp nhận"<br>5. Nút "Từ chối" vẫn có thể nhấn |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Không có đề tài nào**<br>1. Hệ thống không tìm thấy đề tài nào phù hợp<br>2. Hiển thị thông báo "Không có hồ sơ nào cần duyệt" (nếu không có bộ lọc)<br>3. Hoặc "Không tìm thấy hồ sơ phù hợp với bộ lọc" (nếu có bộ lọc)<br>4. Hiển thị nút "Xóa bộ lọc" nếu có bộ lọc đang áp dụng<br><br>**E2. Lỗi khi phê duyệt**<br>1. Trưởng Khoa nhấn nút "Duyệt"<br>2. Hệ thống gọi API nhưng gặp lỗi (500, network error)<br>3. Hệ thống hiển thị toast lỗi "Đã xảy ra lỗi khi cập nhật"<br>4. Trạng thái đề tài không thay đổi<br>5. Trưởng Khoa có thể thử lại<br><br>**E3. Lỗi khi từ chối**<br>1. Trưởng Khoa nhấn nút "Từ chối"<br>2. Hệ thống gọi API nhưng gặp lỗi<br>3. Hệ thống hiển thị toast lỗi "Đã xảy ra lỗi khi cập nhật"<br>4. Trạng thái đề tài không thay đổi<br>5. Trưởng Khoa có thể thử lại<br><br>**E4. Đề tài đã bị xóa**<br>1. Trưởng Khoa đang xem danh sách<br>2. Sinh viên xóa đề tài trong lúc đó<br>3. Trưởng Khoa nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Hệ thống trả về lỗi 404 Not Found<br>5. Hệ thống hiển thị toast "Đề tài không tồn tại"<br>6. Hệ thống tự động refresh danh sách<br><br>**E5. Đề tài đã được duyệt bởi Trưởng Khoa khác**<br>1. Hai Trưởng Khoa cùng xem một đề tài<br>2. Trưởng Khoa A phê duyệt trước<br>3. Trưởng Khoa B cố gắng phê duyệt sau<br>4. Hệ thống kiểm tra trạng thái hiện tại<br>5. Hệ thống trả về lỗi "Đề tài đã được xử lý"<br>6. Hệ thống tự động refresh danh sách<br><br>**E6. Phiên đăng nhập hết hạn**<br>1. Trưởng Khoa đang xem danh sách đề tài<br>2. Phiên làm việc hết hạn<br>3. Trưởng Khoa nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Hệ thống trả về lỗi 401 Unauthorized<br>5. Hệ thống chuyển hướng về trang đăng nhập<br>6. Trưởng Khoa cần đăng nhập lại<br><br>**E7. Không có quyền duyệt**<br>1. Người dùng không phải Trưởng Khoa cố truy cập trang<br>2. Middleware kiểm tra role<br>3. Hệ thống chặn truy cập và chuyển hướng về trang chủ<br>4. Hiển thị thông báo "Bạn không có quyền truy cập"<br><br>**E8. Lỗi khi load danh sách**<br>1. Hệ thống gặp lỗi khi gọi API lấy danh sách<br>2. Hiển thị skeleton loading<br>3. Sau timeout, hiển thị thông báo lỗi<br>4. Trưởng Khoa có thể refresh trang để thử lại |

## Sơ đồ Use Case

Xem file: `uml/dean-project-approval-usecase.plantuml`

## Các bảng liên quan trong Database

1. **ProjectRegistration** - Lưu thông tin đăng ký đề tài
   - `facultyStatus`: PENDING | APPROVED | REJECTED (Trạng thái duyệt cấp Khoa)
   - `instructorStatus`: PENDING | ACCEPTED | REJECTED (Trạng thái GVHD)
   - `title`: Tên đề tài
   - `objective`: Mục tiêu nghiên cứu
   - `expectedOutput`: Sản phẩm dự kiến

2. **User** - Thông tin sinh viên, giảng viên, Trưởng Khoa
   - Sinh viên: role = STUDENT
   - Giảng viên: role = LECTURER
   - Trưởng Khoa: role = DEAN

3. **CallRound** - Đợt đăng ký

4. **Department** - Khoa

5. **Class** - Lớp học

6. **Major** - Ngành học

7. **Notification** - Thông báo gửi cho sinh viên/giảng viên

## Quy tắc nghiệp vụ

1. Chỉ Trưởng Khoa mới có quyền duyệt đề tài cấp khoa
2. Trưởng Khoa chỉ duyệt được đề tài thuộc khoa của mình
3. Chỉ có thể phê duyệt/từ chối đề tài ở trạng thái facultyStatus = PENDING
4. Đề tài đã được phê duyệt (APPROVED) hoặc từ chối (REJECTED) không thể thay đổi trạng thái
5. Khuyến nghị (không bắt buộc): GVHD nên chấp nhận trước khi Trưởng Khoa phê duyệt
6. Nếu GVHD chưa chấp nhận (instructorStatus = PENDING), nút "Duyệt" bị disable
7. Nút "Từ chối" luôn có thể nhấn bất kể trạng thái GVHD
8. Hệ thống tự động gửi thông báo cho sinh viên/giảng viên sau khi phê duyệt/từ chối
9. Danh sách mặc định chỉ hiển thị đề tài có GVHD đã chấp nhận
10. Bộ lọc có thể kết hợp với nhau (tìm kiếm + trạng thái + đợt đăng ký)
11. Phân trang 10 đề tài/trang để tối ưu hiệu suất
12. Tìm kiếm có debounce 300ms để giảm số lần gọi API

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/dean/approvals` - Lấy danh sách (có filter, pagination)
  - `PUT /api/dean/approvals/{id}` - Cập nhật trạng thái (APPROVED/REJECTED)
- **Query Parameters**:
  - `page`: Số trang (default: 1)
  - `limit`: Số lượng/trang (default: 10)
  - `search`: Từ khóa tìm kiếm
  - `facultyStatus`: Lọc theo trạng thái Khoa
  - `callRoundId`: Lọc theo đợt đăng ký
- **State Management**: TanStack Query với hooks:
  - `useDeanApprovals` - Query danh sách
  - `useUpdateDeanApprovalStatus` - Mutation cập nhật
- **UI Components**: Shadcn UI (Table, Dialog, Badge, Button, Select, Input, Pagination, Skeleton)
- **Toast Notification**: Sử dụng thư viện `sonner`
- **Debounce**: Custom hook `useDebounce` với delay 300ms
- **Pagination**: Client-side pagination với component Shadcn
- **Real-time**: Tự động refresh sau khi cập nhật trạng thái

## Workflow tổng thể

```
[Sinh viên/Giảng viên]
    ↓ Đăng ký đề tài
[Đề tài: facultyStatus = PENDING, instructorStatus = PENDING]
    ↓
[Giảng viên hướng dẫn]
    ↓ Chấp nhận
[Đề tài: instructorStatus = ACCEPTED]
    ↓ Hiển thị trong danh sách
[Trưởng Khoa]
    ↓ Xem xét
    ├─→ Phê duyệt → [facultyStatus = APPROVED] → Bắt đầu thực hiện
    └─→ Từ chối → [facultyStatus = REJECTED] → Sinh viên chỉnh sửa lại
```

## So sánh với các Use Case khác

| Tiêu chí | Duyệt đề tài cấp Khoa | Phê duyệt đợt đăng ký |
|----------|------------------------|------------------------|
| **Actor** | Trưởng Khoa | Admin |
| **Đối tượng** | Đề tài nghiên cứu | Đợt đăng ký |
| **Phạm vi** | Chỉ khoa của mình | Tất cả các khoa |
| **Điều kiện** | GVHD đã chấp nhận (khuyến nghị) | Thông tin đầy đủ |
| **Trạng thái** | facultyStatus | approvalStatus |
| **Thông báo** | Gửi sinh viên/giảng viên | Gửi Trưởng Khoa |
| **Có ghi chú** | Không | Có (tùy chọn) |
| **Phân trang** | Có (10/trang) | Không (hiển thị tất cả) |
| **Tìm kiếm** | Có (debounce) | Không |
