# MÔ TẢ USE CASE: XEM DANH SÁCH ĐỀ TÀI ĐƯỢC PHÂN CÔNG

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Xem danh sách đề tài được phân công |
| 2 | **Tác nhân** | Giảng viên / Thành viên Hội đồng (Lecturer / Council Member) |
| 3 | **Mô tả** | Use-case này cho phép Giảng viên hoặc Thành viên Hội đồng xem danh sách các hội đồng mà họ tham gia, bao gồm thông tin chi tiết về hội đồng, danh sách thành viên, danh sách đề tài được phân công, thông tin sinh viên và giảng viên hướng dẫn. Đây là chức năng chỉ đọc (read-only), không có quyền chỉnh sửa |
| 4 | **Tiền điều kiện** | 1. Giảng viên đã đăng nhập vào hệ thống<br>2. Giảng viên có quyền xem hội đồng (role = LECTURER hoặc có trong danh sách thành viên hội đồng)<br>3. Trưởng Khoa đã tạo hội đồng và thêm giảng viên vào hội đồng<br>4. Trưởng Khoa đã phân công đề tài cho hội đồng<br>5. Trưởng Khoa đã hoàn tất phân công (isFinalized = true) |
| 5 | **Hậu điều kiện** | **Sau khi xem thành công:**<br>1. Giảng viên nắm được danh sách hội đồng mình tham gia<br>2. Giảng viên biết vai trò của mình trong từng hội đồng<br>3. Giảng viên xem được danh sách đề tài cần đánh giá<br>4. Giảng viên có thông tin liên hệ của sinh viên và GVHD<br>5. Giảng viên biết ngày và địa điểm bảo vệ<br>6. Không có thay đổi dữ liệu trong hệ thống (chỉ đọc) |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: XEM DANH SÁCH HỘI ĐỒNG**<br><br>**Bước 1: Truy cập trang**<br>1. Giảng viên đăng nhập vào hệ thống<br>2. Truy cập menu "Hội đồng của tôi"<br>3. Hệ thống hiển thị tiêu đề trang: "Hội đồng của tôi"<br>4. Hiển thị mô tả: "Kiểm tra danh sách hội đồng mà bạn đang tham gia theo từng đợt đề tài"<br><br>**Bước 2: Load dữ liệu**<br>5. Hệ thống gọi API GET /api/lecturer/councils<br>6. Backend lấy thông tin giảng viên từ session<br>7. Backend tìm tất cả CouncilMemberAssignment có userId = giảng viên<br>8. Backend join với Council, CallRound, CouncilProjectAssignment<br>9. Backend tính toán số thành viên và số đề tài của từng hội đồng<br>10. Trả về danh sách hội đồng với thông tin đầy đủ<br><br>**Bước 3: Hiển thị danh sách**<br>11. Hệ thống hiển thị Card với tiêu đề "Hội đồng của tôi"<br>12. Hiển thị bảng Table với 8 cột:<br>&nbsp;&nbsp;&nbsp;• STT<br>&nbsp;&nbsp;&nbsp;• Tên hội đồng (có mô tả nếu có)<br>&nbsp;&nbsp;&nbsp;• Đợt đề tài<br>&nbsp;&nbsp;&nbsp;• Vai trò (Badge màu)<br>&nbsp;&nbsp;&nbsp;• Số thành viên<br>&nbsp;&nbsp;&nbsp;• Số đề tài<br>&nbsp;&nbsp;&nbsp;• Ngày tham gia (format dd/mm/yyyy)<br>&nbsp;&nbsp;&nbsp;• Thao tác (nút "Hiển thị chi tiết")<br>13. Mỗi hàng là 1 hội đồng<br>14. Sắp xếp theo ngày tham gia (mới nhất trước)<br><br>**LUỒNG 2: XEM CHI TIẾT HỘI ĐỒNG**<br><br>**Bước 1: Mở Dialog**<br>1. Giảng viên nhấn nút "Hiển thị chi tiết" trên một hội đồng<br>2. Hệ thống mở Dialog với kích thước lớn (max-w-3xl)<br>3. Dialog có thể scroll nếu nội dung dài<br>4. Hiển thị tiêu đề: Tên hội đồng<br>5. Hiển thị mô tả: Tên đợt đề tài<br><br>**Bước 2: Hiển thị thông tin tổng quan**<br>6. Hiển thị 3 thẻ thông tin ngang hàng:<br>&nbsp;&nbsp;&nbsp;• **Vai trò**: Chủ tịch / Thư ký / Ủy viên<br>&nbsp;&nbsp;&nbsp;• **Ngày bảo vệ**: dd/mm/yyyy hoặc "Chưa cập nhật"<br>&nbsp;&nbsp;&nbsp;• **Số đề tài**: X đề tài<br>7. Hiển thị thẻ **Nơi bảo vệ**: Địa điểm hoặc "Chưa cập nhật"<br><br>**Bước 3: Hiển thị danh sách thành viên**<br>8. Hiển thị tiêu đề "Thành viên hội đồng"<br>9. Nếu chưa có thành viên: Hiển thị "Chưa có dữ liệu thành viên hội đồng"<br>10. Nếu có thành viên, hiển thị từng thành viên:<br>&nbsp;&nbsp;&nbsp;• Badge vai trò (Chủ tịch/Thư ký/Ủy viên)<br>&nbsp;&nbsp;&nbsp;• Tên thành viên (in đậm)<br>&nbsp;&nbsp;&nbsp;• Mã giảng viên<br>&nbsp;&nbsp;&nbsp;• Email<br>11. Mỗi thành viên trong một thẻ riêng với border<br><br>**Bước 4: Hiển thị danh sách đề tài**<br>12. Hiển thị tiêu đề "Danh sách đề tài và sinh viên"<br>13. Nếu chưa có đề tài: Hiển thị "Hội đồng này chưa được gán đề tài"<br>14. Nếu có đề tài, hiển thị từng đề tài:<br><br>**Bước 4.1: Thông tin đề tài**<br>15. Hiển thị số thứ tự và tên đề tài (in đậm)<br>16. Mỗi đề tài trong một thẻ riêng với border<br><br>**Bước 4.2: Giảng viên hướng dẫn**<br>17. Hiển thị tiêu đề nhỏ "Giảng viên hướng dẫn:"<br>18. Nếu có GVHD:<br>&nbsp;&nbsp;&nbsp;• Tên GVHD (in đậm)<br>&nbsp;&nbsp;&nbsp;• Mã giảng viên<br>&nbsp;&nbsp;&nbsp;• Email<br>19. Nếu chưa có: Hiển thị "Chưa cập nhật"<br>20. Hiển thị trong thẻ màu nền nhạt (bg-muted/30)<br><br>**Bước 4.3: Sinh viên thuộc đề tài**<br>21. Hiển thị tiêu đề nhỏ "Sinh viên thuộc đề tài:"<br>22. Nếu chưa có sinh viên: Hiển thị "Chưa có dữ liệu sinh viên"<br>23. Nếu có sinh viên, hiển thị từng sinh viên:<br>&nbsp;&nbsp;&nbsp;• Badge vai trò (Chủ nhiệm/Thành viên)<br>&nbsp;&nbsp;&nbsp;• Tên sinh viên (in đậm)<br>&nbsp;&nbsp;&nbsp;• Mã sinh viên<br>&nbsp;&nbsp;&nbsp;• Email<br>24. Hiển thị trong thẻ màu nền đậm hơn (bg-muted/40)<br>25. Mỗi sinh viên trên một dòng riêng<br><br>**Bước 5: Đóng Dialog**<br>26. Giảng viên nhấn nút X hoặc click bên ngoài Dialog<br>27. Dialog đóng lại<br>28. Quay về màn hình danh sách hội đồng<br>29. Có thể mở chi tiết hội đồng khác |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Chưa thuộc hội đồng nào**<br>1. Giảng viên truy cập trang "Hội đồng của tôi"<br>2. API trả về danh sách rỗng<br>3. Hiển thị Card với icon UsersRound<br>4. Hiển thị thông báo: "Hiện tại bạn chưa thuộc hội đồng nào"<br>5. Không hiển thị bảng Table<br>6. Giảng viên cần đợi Trưởng Khoa thêm vào hội đồng<br><br>**A2. Đang tải dữ liệu**<br>1. Giảng viên truy cập trang<br>2. Hệ thống đang gọi API<br>3. Hiển thị loading spinner (vòng tròn xoay)<br>4. Hiển thị text: "Đang tải danh sách hội đồng..."<br>5. Sau khi load xong, hiển thị danh sách<br><br>**A3. Hội đồng chưa có mô tả**<br>1. Giảng viên xem danh sách<br>2. Một số hội đồng không có description<br>3. Chỉ hiển thị tên hội đồng<br>4. Không hiển thị dòng mô tả<br><br>**A4. Ngày bảo vệ chưa cập nhật**<br>1. Giảng viên mở chi tiết hội đồng<br>2. Trường defenseDate = null<br>3. Hiển thị "Chưa cập nhật" thay vì ngày<br>4. Giảng viên cần liên hệ Trưởng Khoa để biết thông tin<br><br>**A5. Nơi bảo vệ chưa cập nhật**<br>1. Giảng viên mở chi tiết hội đồng<br>2. Trường defenseLocation = null hoặc rỗng<br>3. Hiển thị "Chưa cập nhật"<br>4. Giảng viên cần liên hệ Trưởng Khoa<br><br>**A6. Hội đồng chưa có thành viên**<br>1. Giảng viên mở chi tiết hội đồng<br>2. Danh sách members rỗng<br>3. Hiển thị: "Chưa có dữ liệu thành viên hội đồng"<br>4. Có thể do lỗi dữ liệu hoặc chưa đồng bộ<br><br>**A7. Hội đồng chưa có đề tài**<br>1. Giảng viên mở chi tiết hội đồng<br>2. Danh sách projects rỗng<br>3. Hiển thị: "Hội đồng này chưa được gán đề tài"<br>4. Trưởng Khoa chưa phân công đề tài cho hội đồng này<br><br>**A8. Đề tài chưa có GVHD**<br>1. Giảng viên xem chi tiết đề tài<br>2. Trường advisor = null<br>3. Hiển thị: "Chưa cập nhật" trong phần GVHD<br>4. Sinh viên chưa đăng ký GVHD<br><br>**A9. Đề tài chưa có sinh viên**<br>1. Giảng viên xem chi tiết đề tài<br>2. Danh sách students rỗng<br>3. Hiển thị: "Chưa có dữ liệu sinh viên"<br>4. Có thể do lỗi dữ liệu<br><br>**A10. Xem nhiều hội đồng**<br>1. Giảng viên mở chi tiết hội đồng A<br>2. Đóng Dialog<br>3. Mở chi tiết hội đồng B<br>4. Có thể xem qua lại nhiều lần<br>5. Mỗi lần mở Dialog mới với dữ liệu tương ứng<br><br>**A11. Thành viên không có mã**<br>1. Thành viên hội đồng là người bên ngoài<br>2. Trường code = null<br>3. Hiển thị "-" thay vì mã<br>4. Vẫn hiển thị tên và email<br><br>**A12. Sinh viên không có mã**<br>1. Sinh viên chưa cập nhật mã<br>2. Trường code = null<br>3. Hiển thị "-" thay vì mã<br>4. Vẫn hiển thị tên và email |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Lỗi khi load danh sách**<br>1. Giảng viên truy cập trang<br>2. API trả về lỗi (500, network error)<br>3. Hệ thống hiển thị thông báo lỗi<br>4. Có thể thử refresh lại trang<br>5. Liên hệ admin nếu lỗi kéo dài<br><br>**E2. Phiên đăng nhập hết hạn**<br>1. Giảng viên đang xem danh sách<br>2. Session hết hạn<br>3. API trả về 401 Unauthorized<br>4. Hệ thống chuyển hướng về trang login<br>5. Yêu cầu đăng nhập lại<br><br>**E3. Không có quyền truy cập**<br>1. Người dùng không phải giảng viên cố truy cập<br>2. Middleware kiểm tra role<br>3. Chặn truy cập, chuyển về trang chủ<br>4. Hiển thị "Bạn không có quyền truy cập"<br><br>**E4. Dữ liệu không đồng bộ**<br>1. Giảng viên xem chi tiết hội đồng<br>2. Một số thông tin bị thiếu hoặc null<br>3. Hiển thị "Chưa cập nhật" cho các trường thiếu<br>4. Không crash, vẫn hiển thị được phần còn lại<br><br>**E5. Dialog không mở được**<br>1. Giảng viên nhấn "Hiển thị chi tiết"<br>2. Dialog không hiển thị do lỗi UI<br>3. Thử nhấn lại<br>4. Refresh trang nếu vẫn lỗi<br><br>**E6. Dữ liệu quá lớn**<br>1. Hội đồng có quá nhiều đề tài (>50)<br>2. Dialog có scroll bar<br>3. Giảng viên có thể scroll để xem hết<br>4. Không bị giới hạn hiển thị<br><br>**E7. Mất kết nối khi xem**<br>1. Giảng viên đang xem chi tiết<br>2. Mất kết nối internet<br>3. Dữ liệu đã load vẫn hiển thị bình thường<br>4. Chỉ ảnh hưởng khi load trang mới<br><br>**E8. Trình duyệt không hỗ trợ**<br>1. Giảng viên dùng trình duyệt cũ<br>2. Một số tính năng UI không hoạt động<br>3. Khuyến nghị nâng cấp trình duyệt<br>4. Sử dụng Chrome, Firefox, Edge mới nhất<br><br>**E9. Màn hình nhỏ (Mobile)**<br>1. Giảng viên truy cập trên điện thoại<br>2. Dialog tự động điều chỉnh kích thước<br>3. Bảng Table có thể scroll ngang<br>4. Vẫn xem được đầy đủ thông tin<br><br>**E10. Dữ liệu bị xóa trong lúc xem**<br>1. Giảng viên đang xem danh sách<br>2. Trưởng Khoa xóa hội đồng<br>3. Lần refresh tiếp theo, hội đồng biến mất<br>4. Không có thông báo real-time<br>5. Cần refresh để cập nhật<br><br>**E11. API chậm**<br>1. Giảng viên truy cập trang<br>2. API mất nhiều thời gian xử lý<br>3. Hiển thị loading spinner lâu<br>4. Giảng viên cần đợi<br>5. Nếu quá 30s, có thể timeout<br><br>**E12. Chưa hoàn tất phân công**<br>1. Trưởng Khoa chưa nhấn "Hoàn tất phân công"<br>2. isFinalized = false<br>3. Giảng viên chưa thấy hội đồng trong danh sách<br>4. Cần đợi Trưởng Khoa hoàn tất<br>5. Sau khi hoàn tất, dữ liệu mới hiển thị |

## Sơ đồ Use Case

Xem file: `uml/uc/lecturer/view-assigned-projects-usecase.plantuml`

## Các bảng liên quan trong Database

1. **CouncilMemberAssignment** - Phân công thành viên vào hội đồng
   - `councilId`: ID hội đồng
   - `councilMemberId`: ID thành viên
   - `role`: Vai trò (Chủ tịch, Thư ký, Ủy viên)
   - `createdAt`: Ngày tham gia

2. **Council** - Hội đồng đánh giá
   - `name`: Tên hội đồng
   - `description`: Mô tả
   - `callRoundId`: Đợt đăng ký
   - `defenseDate`: Ngày bảo vệ
   - `defenseLocation`: Nơi bảo vệ

3. **CouncilMember** - Thông tin thành viên hội đồng
   - `userId`: ID giảng viên (nếu là giảng viên nội bộ)
   - `name`: Họ tên
   - `email`: Email
   - `code`: Mã giảng viên

4. **CouncilProjectAssignment** - Phân công đề tài cho hội đồng
   - `councilId`: ID hội đồng
   - `projectRegistrationId`: ID đề tài

5. **ProjectRegistration** - Đề tài đăng ký
   - `title`: Tên đề tài
   - `userId`: Sinh viên chủ trì
   - `advisorId`: Giảng viên hướng dẫn

6. **User** - Thông tin người dùng
   - `name`: Họ tên
   - `email`: Email
   - `code`: Mã số
   - `role`: Vai trò (STUDENT, LECTURER)

7. **CallRound** - Đợt đăng ký
   - `name`: Tên đợt
   - `isFinalized`: Đã hoàn tất phân công

## Quy tắc nghiệp vụ

1. Chỉ hiển thị hội đồng mà giảng viên là thành viên
2. Chỉ hiển thị sau khi Trưởng Khoa hoàn tất phân công (isFinalized = true)
3. Giảng viên chỉ có quyền xem, không có quyền chỉnh sửa
4. Hiển thị đầy đủ thông tin liên hệ để giảng viên có thể liên lạc
5. Sắp xếp hội đồng theo ngày tham gia (mới nhất trước)
6. Hiển thị vai trò của giảng viên trong từng hội đồng
7. Mỗi đề tài hiển thị đầy đủ: Tên, GVHD, Sinh viên
8. Sinh viên hiển thị với vai trò: Chủ nhiệm, Thành viên
9. Thông tin ngày bảo vệ và nơi bảo vệ có thể chưa cập nhật
10. Giảng viên có thể xem nhiều hội đồng cùng lúc

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/lecturer/councils` - Lấy danh sách hội đồng của giảng viên
- **State Management**: TanStack Query với hooks:
  - `useLecturerCouncils` - Query danh sách hội đồng
- **UI Components**: Shadcn UI (Card, Table, Dialog, Badge, Button)
- **Data Structure**: Nested data với thông tin đầy đủ (hội đồng → thành viên, đề tài → sinh viên, GVHD)
- **Display**: Table cho danh sách, Dialog cho chi tiết
- **Read-only**: Không có form input, chỉ hiển thị thông tin

## Workflow tổng thể

```
[Giảng viên đăng nhập]
    ↓
[Truy cập "Hội đồng của tôi"]
    ↓
[Hệ thống load danh sách hội đồng]
    ↓
[Hiển thị bảng danh sách]
    ├─→ Tên hội đồng
    ├─→ Đợt đề tài
    ├─→ Vai trò
    ├─→ Số thành viên
    ├─→ Số đề tài
    └─→ Ngày tham gia
    ↓
[Giảng viên click "Hiển thị chi tiết"]
    ↓
[Mở Dialog chi tiết]
    ├─→ Thông tin hội đồng (Ngày, Nơi bảo vệ)
    ├─→ Danh sách thành viên (Vai trò, Tên, Email)
    └─→ Danh sách đề tài
        ├─→ Tên đề tài
        ├─→ Giảng viên hướng dẫn
        └─→ Sinh viên (Vai trò, Tên, Mã, Email)
    ↓
[Giảng viên đóng Dialog]
    ↓
[Có thể xem chi tiết hội đồng khác]
```
