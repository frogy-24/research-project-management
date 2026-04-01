# MÔ TẢ USE CASE: TẠO HỘI ĐỒNG ĐÁNH GIÁ

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Tạo hội đồng đánh giá |
| 2 | **Tác nhân** | Trưởng Khoa (Dean) |
| 3 | **Mô tả** | Use-case này cho phép Trưởng Khoa tạo và quản lý hội đồng đánh giá đề tài nghiên cứu. Trưởng Khoa có thể tạo hội đồng thủ công (chọn 3 thành viên và phân vai trò) hoặc sử dụng tính năng AI để tự động tạo nhiều hội đồng dựa trên cấu hình. Mỗi hội đồng gồm 3 thành viên với vai trò: Chủ tịch, Thư ký, Ủy viên |
| 4 | **Tiền điều kiện** | 1. Trưởng Khoa đã đăng nhập vào hệ thống<br>2. Trưởng Khoa có quyền quản lý hội đồng (role = DEAN)<br>3. Đã chọn đợt đăng ký có trạng thái APPROVED<br>4. Có ít nhất 3 thành viên trong danh sách thành viên hội đồng<br>5. Có đề tài đã được phê duyệt cần phân công hội đồng |
| 5 | **Hậu điều kiện** | **Khi tạo thành công:**<br>1. Hội đồng mới được lưu vào database<br>2. 3 thành viên được gán vào hội đồng với vai trò cụ thể<br>3. Hội đồng hiển thị trong danh sách hội đồng<br>4. Thành viên không thể tham gia hội đồng khác trong cùng đợt<br>5. Hội đồng sẵn sàng để phân công đề tài<br><br>**Khi xóa hội đồng:**<br>1. Hội đồng bị xóa khỏi database<br>2. Các thành viên được giải phóng, có thể tham gia hội đồng khác<br>3. Các phân công đề tài trong hội đồng bị xóa |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: TẠO HỘI ĐỒNG THỦ CÔNG**<br><br>**Bước 1: Chuẩn bị**<br>1. Trưởng Khoa đăng nhập và truy cập trang "Quản lý Hội đồng"<br>2. Chọn đợt đăng ký từ dropdown (chỉ hiển thị đợt APPROVED)<br>3. Hệ thống hiển thị thống kê tổng quan (tổng đề tài, sinh viên, GVHD, thành viên hội đồng)<br>4. Hệ thống hiển thị danh sách thành viên hội đồng (phân trang 10/trang)<br><br>**Bước 2: Quản lý thành viên hội đồng**<br>5. Trưởng Khoa nhấn "Thêm thành viên" để mở Dialog<br>6. Tìm kiếm giảng viên trong khoa bằng tên hoặc email<br>7. Chọn nhiều giảng viên bằng Checkbox<br>8. Nhấn "Thêm vào hội đồng" để thêm vào danh sách<br>9. Hệ thống gọi API POST /api/dean/call-rounds/{id}/council-members<br>10. Thành viên mới hiển thị trong bảng danh sách<br><br>**Bước 3: Tạo hội đồng**<br>11. Trưởng Khoa nhấn nút "Tạo hội đồng"<br>12. Hệ thống mở Dialog "Tạo hội đồng mới"<br>13. Nhập tên hội đồng (bắt buộc), VD: "Hội đồng 1"<br>14. Nhập mô tả (tùy chọn)<br>15. Hệ thống hiển thị danh sách thành viên khả dụng (chưa thuộc hội đồng nào)<br><br>**Bước 4: Chọn thành viên**<br>16. Tìm kiếm thành viên bằng tên/email trong ScrollArea<br>17. Click vào thành viên để thêm (tối đa 3)<br>18. Thành viên thứ 1 tự động gán vai trò "Chủ tịch"<br>19. Thành viên thứ 2 tự động gán vai trò "Thư ký"<br>20. Thành viên thứ 3 tự động gán vai trò "Ủy viên"<br>21. Có thể thay đổi vai trò bằng dropdown Select<br>22. Có thể xóa thành viên đã chọn bằng nút X<br><br>**Bước 5: Hoàn tất**<br>23. Kiểm tra đã chọn đủ 3 thành viên và nhập tên hội đồng<br>24. Nhấn nút "Tạo hội đồng"<br>25. Hệ thống gọi API POST /api/dean/councils với payload:<br>&nbsp;&nbsp;&nbsp;{ callRoundId, name, description, members: [{councilMemberId, role}] }<br>26. Hệ thống tạo Council và CouncilMemberAssignment<br>27. Hiển thị toast "Đã tạo hội đồng thành công"<br>28. Dialog đóng, danh sách hội đồng tự động refresh<br>29. Hội đồng mới hiển thị trong bảng với 3 thành viên<br><br>**LUỒNG 2: TẠO HỘI ĐỒNG NHANH (AI)**<br><br>**Bước 1: Mở Dialog AI**<br>1. Trưởng Khoa nhấn "Thêm nhanh hội đồng (AI)"<br>2. Hệ thống mở Dialog cấu hình<br><br>**Bước 2: Cấu hình**<br>3. Nhập "Số đề tài tối thiểu / hội đồng" (VD: 5)<br>4. Nhập "Số đề tài tối đa / hội đồng" (VD: 10)<br>5. Tùy chọn: Chọn "Xóa hội đồng cũ trước khi tạo"<br>6. Nhấn "Tạo danh sách gợi ý"<br><br>**Bước 3: AI xử lý**<br>7. Hệ thống gọi API POST /api/dean/councils/quick-add<br>8. AI phân tích số lượng đề tài và thành viên<br>9. AI tự động chia thành nhiều hội đồng<br>10. AI phân công thành viên và đề tài cho từng hội đồng<br>11. Trả về danh sách hội đồng đề xuất<br><br>**Bước 4: Xem trước và chọn**<br>12. Hệ thống hiển thị danh sách hội đồng trong ScrollArea<br>13. Mỗi hội đồng hiển thị: Tên, Mô tả, Số thành viên, Số đề tài<br>14. Tất cả hội đồng được chọn mặc định (Checkbox checked)<br>15. Trưởng Khoa có thể bỏ chọn hội đồng không muốn tạo<br>16. Có thể nhấn "Đồng ý" trên từng hội đồng để xác nhận riêng lẻ<br><br>**Bước 5: Xác nhận**<br>17. Nhấn nút "Đồng ý (X)" với X là số hội đồng đã chọn<br>18. Hệ thống gọi API POST /api/dean/councils/quick-add/confirm<br>19. Hệ thống tạo tất cả hội đồng đã chọn<br>20. Hiển thị toast "Đã xác nhận hội đồng thành công"<br>21. Dialog đóng, danh sách refresh<br>22. Các hội đồng mới hiển thị trong bảng |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Tạo thành viên bên ngoài**<br>1. Trưởng Khoa nhấn "Tạo thành viên mới"<br>2. Nhập họ tên (bắt buộc)<br>3. Nhập email (bắt buộc)<br>4. Nhập số điện thoại (tùy chọn)<br>5. Nhập đơn vị công tác (tùy chọn)<br>6. Nhấn "Tạo và thêm vào hội đồng"<br>7. Hệ thống gọi API POST /api/dean/council-members/external<br>8. Tạo CouncilMember mới và thêm vào CallRoundCouncilMember<br>9. Thành viên mới hiển thị trong danh sách<br><br>**A2. Chỉnh sửa hội đồng**<br>1. Trưởng Khoa nhấn nút "Sửa" trên một hội đồng<br>2. Dialog mở với thông tin hiện tại<br>3. Có thể đổi tên, mô tả hội đồng<br>4. Có thể xóa thành viên hiện tại<br>5. Có thể thêm thành viên mới (nếu chưa đủ 3)<br>6. Có thể thay đổi vai trò thành viên<br>7. Nhấn "Lưu thay đổi"<br>8. Hệ thống gọi API PUT /api/dean/councils/{id}<br>9. Cập nhật thông tin hội đồng<br><br>**A3. Xem chi tiết hội đồng**<br>1. Trưởng Khoa nhấn "Chi tiết" trên một hội đồng<br>2. Dialog hiển thị thông tin đầy đủ:<br>&nbsp;&nbsp;&nbsp;• Ngày bảo vệ, Nơi bảo vệ<br>&nbsp;&nbsp;&nbsp;• Số thành viên, Số đề tài<br>&nbsp;&nbsp;&nbsp;• Danh sách thành viên với vai trò<br>&nbsp;&nbsp;&nbsp;• Danh sách đề tài được phân công<br>&nbsp;&nbsp;&nbsp;• Giảng viên hướng dẫn của từng đề tài<br>&nbsp;&nbsp;&nbsp;• Sinh viên thuộc đề tài<br><br>**A4. Xóa thành viên khỏi danh sách**<br>1. Trưởng Khoa nhấn "Xóa" trên một thành viên<br>2. Hệ thống hiển thị confirm dialog<br>3. Nhấn "OK" để xác nhận<br>4. Hệ thống gọi API DELETE /api/dean/call-rounds/{id}/council-members/{memberId}<br>5. Xóa khỏi CallRoundCouncilMember<br>6. Nếu thành viên đang trong hội đồng, không cho phép xóa<br>7. Danh sách tự động refresh<br><br>**A5. Phân trang danh sách thành viên**<br>1. Trưởng Khoa nhấn số trang hoặc Previous/Next<br>2. Hệ thống gọi API với query parameter ?page={n}&limit=10<br>3. Hiển thị 10 thành viên của trang đó<br>4. Cập nhật thông tin phân trang ở footer<br><br>**A6. Xác nhận từng hội đồng AI riêng lẻ**<br>1. Trong danh sách đề xuất AI, nhấn "Đồng ý" trên 1 hội đồng<br>2. Hệ thống gọi API confirm với chỉ 1 councilId<br>3. Hội đồng đó được tạo ngay lập tức<br>4. Hội đồng biến mất khỏi danh sách đề xuất<br>5. Các hội đồng khác vẫn còn để chọn |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Không đủ thành viên**<br>1. Trưởng Khoa cố tạo hội đồng nhưng chưa chọn đủ 3 thành viên<br>2. Nút "Tạo hội đồng" bị disable<br>3. Hiển thị thông báo "Vui lòng chọn đủ 3 thành viên"<br><br>**E2. Chưa nhập tên hội đồng**<br>1. Trưởng Khoa chưa nhập tên hội đồng<br>2. Nút "Tạo hội đồng" bị disable<br>3. Hiển thị toast "Vui lòng nhập tên hội đồng"<br><br>**E3. Không còn thành viên khả dụng**<br>1. Tất cả thành viên đã được phân vào hội đồng<br>2. Danh sách thành viên khả dụng trống<br>3. Hiển thị "Không còn thành viên khả dụng để tạo hội đồng mới"<br>4. Cần thêm thành viên mới hoặc xóa hội đồng cũ<br><br>**E4. Lỗi khi tạo hội đồng**<br>1. Trưởng Khoa nhấn "Tạo hội đồng"<br>2. API trả về lỗi (500, network error)<br>3. Hiển thị toast "Lỗi khi tạo hội đồng"<br>4. Dialog không đóng, có thể thử lại<br><br>**E5. Xóa hội đồng có đề tài**<br>1. Trưởng Khoa nhấn "Xóa" trên hội đồng đã có đề tài<br>2. Hiển thị confirm: "Tất cả phân công thành viên và đề tài sẽ bị xóa"<br>3. Nếu OK, xóa hội đồng và tất cả phân công<br>4. Nếu Cancel, không làm gì<br><br>**E6. Cấu hình AI không hợp lệ**<br>1. Min > Max trong cấu hình AI<br>2. Hiển thị toast "Giá trị tối thiểu không được lớn hơn tối đa"<br>3. Không gọi API, yêu cầu sửa lại<br><br>**E7. AI không tạo được hội đồng**<br>1. Không đủ thành viên hoặc đề tài<br>2. API trả về lỗi với message cụ thể<br>3. Hiển thị toast với lý do<br>4. Không có danh sách đề xuất<br><br>**E8. Không chọn hội đồng nào để xác nhận**<br>1. Trưởng Khoa bỏ chọn tất cả hội đồng AI<br>2. Nút "Đồng ý (0)" bị disable<br>3. Hiển thị toast "Vui lòng chọn ít nhất 1 hội đồng"<br><br>**E9. Xóa thành viên đang trong hội đồng**<br>1. Trưởng Khoa cố xóa thành viên đã được phân vào hội đồng<br>2. API trả về lỗi "Thành viên đang trong hội đồng"<br>3. Hiển thị toast lỗi<br>4. Cần xóa hội đồng trước, sau đó mới xóa thành viên<br><br>**E10. Phiên đăng nhập hết hạn**<br>1. Trưởng Khoa thao tác nhưng session hết hạn<br>2. API trả về 401 Unauthorized<br>3. Hệ thống chuyển hướng về trang login<br>4. Yêu cầu đăng nhập lại<br><br>**E11. Không có quyền**<br>1. Người dùng không phải Trưởng Khoa cố truy cập<br>2. Middleware kiểm tra role<br>3. Chặn truy cập, chuyển về trang chủ<br>4. Hiển thị "Bạn không có quyền truy cập"<br><br>**E12. Đợt đăng ký chưa APPROVED**<br>1. Trưởng Khoa chọn đợt chưa được phê duyệt<br>2. Hệ thống tự động bỏ chọn<br>3. Chỉ hiển thị các đợt APPROVED trong dropdown |

## Sơ đồ Use Case

Xem file: `uml/council-creation-usecase.plantuml`

## Các bảng liên quan trong Database

1. **Council** - Hội đồng đánh giá
   - `name`: Tên hội đồng
   - `description`: Mô tả
   - `callRoundId`: Đợt đăng ký
   - `defenseDate`: Ngày bảo vệ
   - `defenseLocation`: Nơi bảo vệ

2. **CouncilMemberAssignment** - Phân công thành viên vào hội đồng
   - `councilId`: ID hội đồng
   - `councilMemberId`: ID thành viên
   - `role`: Vai trò (Chủ tịch, Thư ký, Ủy viên)

3. **CallRoundCouncilMember** - Danh sách thành viên hội đồng của đợt
   - `callRoundId`: Đợt đăng ký
   - `councilMemberId`: ID thành viên

4. **CouncilMember** - Thông tin thành viên hội đồng
   - `name`: Họ tên
   - `email`: Email
   - `phone`: Số điện thoại
   - `organization`: Đơn vị công tác
   - `majorId`: Ngành chuyên môn

5. **CouncilProjectAssignment** - Phân công đề tài cho hội đồng
   - `councilId`: ID hội đồng
   - `projectRegistrationId`: ID đề tài

## Quy tắc nghiệp vụ

1. Mỗi hội đồng phải có đúng 3 thành viên
2. 3 vai trò bắt buộc: Chủ tịch, Thư ký, Ủy viên
3. Một thành viên chỉ được tham gia 1 hội đồng trong cùng đợt đăng ký
4. Thành viên đã được phân công vào hội đồng không hiển thị trong danh sách khả dụng
5. Tên hội đồng là bắt buộc, mô tả là tùy chọn
6. Có thể tạo thành viên bên ngoài khoa (external member)
7. Khi xóa hội đồng, tất cả phân công thành viên và đề tài đều bị xóa
8. Chỉ có thể tạo hội đồng cho đợt đăng ký đã được APPROVED
9. Vai trò được tự động gán theo thứ tự: thành viên 1 = Chủ tịch, 2 = Thư ký, 3 = Ủy viên
10. Có thể thay đổi vai trò thành viên sau khi chọn

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/dean/councils?callRoundId={id}` - Lấy danh sách hội đồng
  - `POST /api/dean/councils` - Tạo hội đồng mới
  - `PUT /api/dean/councils/{id}` - Cập nhật hội đồng
  - `DELETE /api/dean/councils/{id}` - Xóa hội đồng
  - `GET /api/dean/call-rounds/{id}/council-members` - Lấy danh sách thành viên
  - `POST /api/dean/call-rounds/{id}/council-members` - Thêm thành viên
  - `POST /api/dean/council-members/external` - Tạo thành viên bên ngoài
  - `POST /api/dean/councils/quick-add` - Tạo nhanh hội đồng (AI)
  - `POST /api/dean/councils/quick-add/confirm` - Xác nhận hội đồng AI
- **State Management**: TanStack Query với hooks:
  - `useCouncils` - Query danh sách hội đồng
  - `useCreateCouncil` - Mutation tạo hội đồng
  - `useUpdateCouncil` - Mutation cập nhật
  - `useDeleteCouncil` - Mutation xóa
  - `useCouncilMembers` - Query thành viên (có pagination)
  - `useQuickAddCouncilsAI` - Mutation tạo nhanh AI
- **UI Components**: Shadcn UI (Dialog, Table, Select, ScrollArea, Checkbox, Badge)
- **Pagination**: Server-side pagination 10 thành viên/trang
- **AI Feature**: Tự động phân chia hội đồng dựa trên cấu hình min/max đề tài

## Workflow tổng thể

```
[Trưởng Khoa chọn đợt đăng ký]
    ↓
[Quản lý thành viên hội đồng]
    ├─→ Thêm giảng viên trong khoa
    └─→ Tạo thành viên bên ngoài
    ↓
[Tạo hội đồng]
    ├─→ Thủ công: Chọn 3 thành viên + Phân vai trò
    └─→ AI: Cấu hình → Xem trước → Xác nhận
    ↓
[Hội đồng được tạo]
    ↓
[Phân công đề tài cho hội đồng]
    ↓
[Hội đồng đánh giá đề tài]
```
