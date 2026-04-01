# MÔ TẢ USE CASE: PHÂN CÔNG ĐỀ TÀI CHO HỘI ĐỒNG

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Phân công đề tài cho hội đồng đánh giá |
| 2 | **Tác nhân** | Trưởng Khoa (Dean) |
| 3 | **Mô tả** | Use-case này cho phép Trưởng Khoa phân công các đề tài đã được phê duyệt vào các hội đồng đánh giá. Trưởng Khoa có thể gán nhiều đề tài vào một hội đồng, bỏ gán đề tài khỏi hội đồng, và hoàn tất phân công để công bố cho các bên liên quan. Hệ thống hỗ trợ tìm kiếm đề tài và hiển thị trạng thái phân công theo thời gian thực |
| 4 | **Tiền điều kiện** | 1. Trưởng Khoa đã đăng nhập vào hệ thống<br>2. Trưởng Khoa có quyền phân công đề tài (role = DEAN)<br>3. Đã có đợt đăng ký với trạng thái APPROVED<br>4. Đã có hội đồng được tạo trong đợt đăng ký<br>5. Có đề tài đã được phê duyệt (approvalStatus = APPROVED)<br>6. Phân công chưa được hoàn tất (isFinalized = false) |
| 5 | **Hậu điều kiện** | **Khi gán đề tài thành công:**<br>1. Đề tài được liên kết với hội đồng trong bảng CouncilProjectAssignment<br>2. Đề tài biến mất khỏi danh sách "Chưa gán"<br>3. Đề tài xuất hiện trong danh sách "Đã gán" của hội đồng<br>4. Số lượng đề tài của hội đồng tăng lên<br><br>**Khi bỏ gán đề tài:**<br>1. Liên kết giữa đề tài và hội đồng bị xóa<br>2. Đề tài quay về danh sách "Chưa gán"<br>3. Số lượng đề tài của hội đồng giảm xuống<br><br>**Khi hoàn tất phân công:**<br>1. Trạng thái đợt đăng ký chuyển sang "Đã hoàn tất phân công"<br>2. Hội đồng, GVHD, thành viên hội đồng có thể xem phân công<br>3. Không thể chỉnh sửa phân công (gán/bỏ gán) nữa<br>4. Hệ thống gửi thông báo cho các bên liên quan |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: GÁN ĐỀ TÀI VÀO HỘI ĐỒNG**<br><br>**Bước 1: Chuẩn bị**<br>1. Trưởng Khoa đăng nhập và truy cập trang "Gán Đề Tài Vào Hội Đồng"<br>2. Hệ thống hiển thị dropdown chọn đợt đăng ký<br>3. Chỉ hiển thị các đợt có trạng thái APPROVED<br>4. Trưởng Khoa chọn đợt đăng ký từ dropdown<br><br>**Bước 2: Load dữ liệu**<br>5. Hệ thống gọi API GET /api/dean/council-project-assignments?callRoundId={id}<br>6. Hệ thống load danh sách hội đồng của đợt<br>7. Hệ thống load danh sách đề tài đã APPROVED<br>8. Hệ thống kiểm tra trạng thái isFinalized<br>9. Hiển thị Badge: "Đang xếp ảo" hoặc "Đã hoàn tất phân công"<br>10. Hiển thị nút "Hoàn tất xác nhận tất cả"<br><br>**Bước 3: Chọn hội đồng**<br>11. Trưởng Khoa chọn hội đồng từ dropdown<br>12. Dropdown hiển thị: Tên hội đồng (X đề tài)<br>13. Hệ thống chia màn hình thành 2 cột:<br>&nbsp;&nbsp;&nbsp;• Trái: Đề tài chưa gán hội đồng<br>&nbsp;&nbsp;&nbsp;• Phải: Đề tài của hội đồng đã chọn<br><br>**Bước 4: Xem và tìm kiếm đề tài chưa gán**<br>14. Cột trái hiển thị danh sách đề tài chưa có councilAssignment<br>15. Mỗi đề tài hiển thị: Tên đề tài, Tên SV, Mã SV<br>16. Có ô tìm kiếm với icon Search<br>17. Trưởng Khoa nhập từ khóa (tên đề tài/sinh viên/mã SV)<br>18. Hệ thống lọc real-time (client-side)<br>19. Chỉ hiển thị đề tài khớp với từ khóa<br><br>**Bước 5: Chọn đề tài để gán**<br>20. Trưởng Khoa click Checkbox bên cạnh đề tài<br>21. Có thể chọn nhiều đề tài cùng lúc<br>22. Đề tài được chọn có Checkbox checked<br>23. Footer hiển thị: "Đã chọn X đề tài"<br>24. Nút "Gán vào hội đồng" được enable khi có ít nhất 1 đề tài<br><br>**Bước 6: Thực hiện gán**<br>25. Trưởng Khoa nhấn nút "Gán vào hội đồng"<br>26. Hệ thống validate:<br>&nbsp;&nbsp;&nbsp;• Đã chọn đợt đăng ký<br>&nbsp;&nbsp;&nbsp;• Đã chọn hội đồng<br>&nbsp;&nbsp;&nbsp;• Đã chọn ít nhất 1 đề tài<br>&nbsp;&nbsp;&nbsp;• Chưa hoàn tất phân công (isFinalized = false)<br>27. Hệ thống gọi API POST /api/dean/council-project-assignments/assign<br>28. Payload: { callRoundId, councilId, projectRegistrationIds: [...] }<br>29. Backend tạo bản ghi CouncilProjectAssignment cho mỗi đề tài<br>30. Hiển thị toast "Gán đề tài vào hội đồng thành công"<br>31. Danh sách tự động refresh<br>32. Đề tài đã gán biến mất khỏi cột trái<br>33. Đề tài xuất hiện trong cột phải (bảng đã gán)<br>34. Số lượng đề tài trong dropdown hội đồng tăng lên<br>35. Checkbox được reset (bỏ chọn tất cả)<br><br>**LUỒNG 2: BỎ GÁN ĐỀ TÀI KHỎI HỘI ĐỒNG**<br><br>**Bước 1: Xem đề tài đã gán**<br>1. Sau khi chọn hội đồng, cột phải hiển thị bảng Table<br>2. Bảng có 4 cột: Checkbox, Tên đề tài, Sinh viên, Trạng thái<br>3. Mỗi dòng là 1 đề tài đã được gán vào hội đồng<br>4. Cột Trạng thái hiển thị Badge "Đã gán"<br><br>**Bước 2: Chọn đề tài để bỏ gán**<br>5. Trưởng Khoa click Checkbox trên các đề tài muốn bỏ gán<br>6. Có thể chọn nhiều đề tài cùng lúc<br>7. Footer hiển thị: "Đã chọn X đề tài để bỏ gán"<br>8. Nút "Bỏ gán đề tài đã chọn" được enable<br><br>**Bước 3: Xác nhận bỏ gán**<br>9. Trưởng Khoa nhấn nút "Bỏ gán đề tài đã chọn" (màu đỏ, icon Trash2)<br>10. Hệ thống hiển thị confirm dialog<br>11. Nội dung: "Bạn có chắc chắn muốn bỏ gán các đề tài đã chọn?"<br>12. Trưởng Khoa nhấn "OK" để xác nhận<br><br>**Bước 4: Thực hiện bỏ gán**<br>13. Hệ thống validate:<br>&nbsp;&nbsp;&nbsp;• Đã chọn ít nhất 1 đề tài<br>&nbsp;&nbsp;&nbsp;• Chưa hoàn tất phân công<br>14. Hệ thống gọi API POST /api/dean/council-project-assignments/unassign<br>15. Payload: { callRoundId, projectRegistrationIds: [...] }<br>16. Backend xóa bản ghi CouncilProjectAssignment<br>17. Hiển thị toast "Đã bỏ gán đề tài khỏi hội đồng"<br>18. Danh sách tự động refresh<br>19. Đề tài biến mất khỏi bảng cột phải<br>20. Đề tài xuất hiện lại trong cột trái (chưa gán)<br>21. Số lượng đề tài trong dropdown hội đồng giảm xuống<br>22. Checkbox được reset<br><br>**LUỒNG 3: HOÀN TẤT PHÂN CÔNG**<br><br>**Bước 1: Kiểm tra phân công**<br>1. Trưởng Khoa đã phân công xong tất cả đề tài<br>2. Kiểm tra lại danh sách "Chưa gán" còn đề tài nào không<br>3. Kiểm tra số lượng đề tài của từng hội đồng<br>4. Đảm bảo phân công hợp lý<br><br>**Bước 2: Xác nhận hoàn tất**<br>5. Trưởng Khoa nhấn nút "Hoàn tất xác nhận tất cả"<br>6. Hệ thống hiển thị confirm dialog<br>7. Nội dung: "Xác nhận hoàn tất phân công cho toàn bộ đợt này? Sau khi xác nhận, hội đồng/giảng viên/thành viên mới nhìn thấy và bạn sẽ không thể chỉnh sửa."<br>8. Trưởng Khoa nhấn "OK" để xác nhận<br><br>**Bước 3: Thực hiện hoàn tất**<br>9. Hệ thống gọi API POST /api/dean/council-project-assignments/finalize<br>10. Payload: { callRoundId }<br>11. Backend cập nhật CallRound.isFinalized = true<br>12. Hệ thống gửi thông báo cho:<br>&nbsp;&nbsp;&nbsp;• Thành viên hội đồng<br>&nbsp;&nbsp;&nbsp;• Giảng viên hướng dẫn<br>&nbsp;&nbsp;&nbsp;• Sinh viên có đề tài<br>13. Hiển thị toast "Đã hoàn tất phân công toàn bộ đợt đăng ký"<br>14. Badge chuyển từ "Đang xếp ảo" sang "Đã hoàn tất phân công"<br>15. Tất cả nút gán/bỏ gán bị disable<br>16. Nút "Hoàn tất xác nhận tất cả" bị disable<br>17. Các bên liên quan có thể xem phân công |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Không có đợt APPROVED**<br>1. Trưởng Khoa truy cập trang phân công<br>2. Dropdown đợt đăng ký trống<br>3. Hiển thị: "Chưa có đợt đề tài nào ở trạng thái APPROVED"<br>4. Không thể thực hiện phân công<br>5. Cần đợi Admin phê duyệt đợt đăng ký<br><br>**A2. Không có hội đồng**<br>1. Trưởng Khoa chọn đợt đăng ký<br>2. Dropdown hội đồng trống<br>3. Không hiển thị 2 cột phân công<br>4. Cần tạo hội đồng trước khi phân công<br><br>**A3. Không có đề tài APPROVED**<br>1. Trưởng Khoa chọn đợt và hội đồng<br>2. Cột trái (chưa gán) trống<br>3. Hiển thị: "Không còn đề tài chưa gán"<br>4. Tất cả đề tài đã được phân công hoặc chưa có đề tài nào được duyệt<br><br>**A4. Tìm kiếm không có kết quả**<br>1. Trưởng Khoa nhập từ khóa tìm kiếm<br>2. Không có đề tài nào khớp<br>3. Danh sách trống<br>4. Có thể xóa từ khóa để xem lại tất cả<br><br>**A5. Hội đồng chưa có đề tài**<br>1. Trưởng Khoa chọn hội đồng mới tạo<br>2. Cột phải hiển thị: "Hội đồng này chưa có đề tài nào"<br>3. Bảng Table không hiển thị<br>4. Cần gán đề tài vào hội đồng<br><br>**A6. Chuyển đổi giữa các hội đồng**<br>1. Trưởng Khoa đang xem hội đồng A<br>2. Chọn hội đồng B từ dropdown<br>3. Hệ thống reset checkbox đã chọn<br>4. Cột phải load đề tài của hội đồng B<br>5. Có thể chuyển qua lại nhiều lần<br><br>**A7. Gán tất cả đề tài còn lại**<br>1. Còn ít đề tài chưa gán<br>2. Trưởng Khoa chọn tất cả bằng cách click từng checkbox<br>3. Hoặc có thể gán từng nhóm nhỏ<br>4. Gán vào hội đồng cuối cùng<br><br>**A8. Điều chỉnh phân công**<br>1. Trưởng Khoa thấy hội đồng A có quá nhiều đề tài<br>2. Bỏ gán một số đề tài khỏi hội đồng A<br>3. Chọn hội đồng B<br>4. Gán các đề tài đó vào hội đồng B<br>5. Cân bằng số lượng đề tài giữa các hội đồng |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Chưa chọn đợt đăng ký**<br>1. Trưởng Khoa nhấn "Gán vào hội đồng" mà chưa chọn đợt<br>2. Hiển thị toast "Vui lòng chọn đợt đăng ký"<br>3. Không gọi API<br><br>**E2. Chưa chọn hội đồng**<br>1. Trưởng Khoa nhấn "Gán vào hội đồng" mà chưa chọn hội đồng<br>2. Hiển thị toast "Vui lòng chọn hội đồng"<br>3. Không gọi API<br><br>**E3. Chưa chọn đề tài nào**<br>1. Trưởng Khoa nhấn "Gán vào hội đồng" mà chưa chọn đề tài<br>2. Hiển thị toast "Vui lòng chọn ít nhất 1 đề tài"<br>3. Nút bị disable, không thể nhấn<br><br>**E4. Đã hoàn tất phân công**<br>1. Trưởng Khoa cố gán/bỏ gán sau khi đã hoàn tất<br>2. Hiển thị toast "Đợt này đã hoàn tất phân công. Không thể chỉnh sửa."<br>3. Tất cả nút bị disable<br>4. Checkbox bị disable<br>5. Không thể thao tác<br><br>**E5. Lỗi khi gán đề tài**<br>1. Trưởng Khoa nhấn "Gán vào hội đồng"<br>2. API trả về lỗi (500, network error)<br>3. Hiển thị toast "Không thể gán đề tài" + message lỗi<br>4. Danh sách không thay đổi<br>5. Có thể thử lại<br><br>**E6. Hủy xác nhận bỏ gán**<br>1. Trưởng Khoa nhấn "Bỏ gán đề tài đã chọn"<br>2. Confirm dialog hiển thị<br>3. Trưởng Khoa nhấn "Cancel"<br>4. Dialog đóng, không làm gì<br>5. Đề tài vẫn còn trong hội đồng<br><br>**E7. Lỗi khi bỏ gán**<br>1. Trưởng Khoa xác nhận bỏ gán<br>2. API trả về lỗi<br>3. Hiển thị toast "Không thể bỏ gán đề tài" + message lỗi<br>4. Đề tài vẫn còn trong hội đồng<br><br>**E8. Hủy hoàn tất phân công**<br>1. Trưởng Khoa nhấn "Hoàn tất xác nhận tất cả"<br>2. Confirm dialog hiển thị<br>3. Trưởng Khoa nhấn "Cancel"<br>4. Dialog đóng, không làm gì<br>5. Vẫn ở chế độ "Đang xếp ảo"<br>6. Có thể tiếp tục chỉnh sửa<br><br>**E9. Lỗi khi hoàn tất**<br>1. Trưởng Khoa xác nhận hoàn tất<br>2. API trả về lỗi<br>3. Hiển thị toast "Không thể hoàn tất phân công" + message lỗi<br>4. Vẫn ở chế độ "Đang xếp ảo"<br>5. Có thể thử lại<br><br>**E10. Đã hoàn tất rồi nhấn lại**<br>1. Đợt đã ở trạng thái "Đã hoàn tất"<br>2. Trưởng Khoa nhấn nút "Hoàn tất" (nếu chưa disable)<br>3. Hiển thị toast "Đợt này đã hoàn tất phân công."<br>4. Không gọi API<br><br>**E11. Phiên đăng nhập hết hạn**<br>1. Trưởng Khoa thao tác nhưng session hết hạn<br>2. API trả về 401 Unauthorized<br>3. Hệ thống chuyển hướng về trang login<br>4. Yêu cầu đăng nhập lại<br><br>**E12. Không có quyền**<br>1. Người dùng không phải Trưởng Khoa cố truy cập<br>2. Middleware kiểm tra role<br>3. Chặn truy cập, chuyển về trang chủ<br>4. Hiển thị "Bạn không có quyền truy cập"<br><br>**E13. Đợt đăng ký bị thay đổi trạng thái**<br>1. Trưởng Khoa đang phân công<br>2. Admin thay đổi trạng thái đợt về PENDING<br>3. Hệ thống tự động bỏ chọn đợt<br>4. Danh sách bị xóa<br>5. Cần chọn lại đợt APPROVED khác |

## Sơ đồ Use Case

Xem file: `uml/council-project-assignment-usecase.plantuml`

## Các bảng liên quan trong Database

1. **CouncilProjectAssignment** - Phân công đề tài cho hội đồng
   - `councilId`: ID hội đồng
   - `projectRegistrationId`: ID đề tài đăng ký
   - `createdAt`: Thời gian phân công

2. **Council** - Hội đồng đánh giá
   - `name`: Tên hội đồng
   - `callRoundId`: Đợt đăng ký
   - `_count.projects`: Số lượng đề tài đã gán

3. **ProjectRegistration** - Đề tài đăng ký
   - `title`: Tên đề tài
   - `approvalStatus`: Trạng thái duyệt (phải là APPROVED)
   - `userId`: Sinh viên chủ trì
   - `councilAssignment`: Thông tin hội đồng đã gán (nếu có)

4. **CallRound** - Đợt đăng ký
   - `name`: Tên đợt
   - `approvalStatus`: Trạng thái (phải là APPROVED)
   - `isFinalized`: Đã hoàn tất phân công hay chưa

5. **User** - Thông tin sinh viên
   - `name`: Họ tên
   - `code`: Mã sinh viên

## Quy tắc nghiệp vụ

1. Chỉ có thể gán đề tài có trạng thái APPROVED
2. Một đề tài chỉ được gán vào 1 hội đồng duy nhất
3. Một hội đồng có thể có nhiều đề tài
4. Không giới hạn số lượng đề tài tối đa cho một hội đồng
5. Có thể gán nhiều đề tài cùng lúc vào một hội đồng
6. Có thể bỏ gán nhiều đề tài cùng lúc
7. Sau khi hoàn tất phân công, không thể chỉnh sửa
8. Chỉ Trưởng Khoa mới có quyền phân công đề tài
9. Phân công ở chế độ "Đang xếp ảo" cho đến khi hoàn tất
10. Khi hoàn tất, tất cả phân công trong đợt được công bố cùng lúc

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/dean/council-project-assignments?callRoundId={id}` - Lấy dữ liệu phân công
  - `POST /api/dean/council-project-assignments/assign` - Gán đề tài vào hội đồng
  - `POST /api/dean/council-project-assignments/unassign` - Bỏ gán đề tài
  - `POST /api/dean/council-project-assignments/finalize` - Hoàn tất phân công
- **State Management**: TanStack Query với hooks:
  - `useCouncilProjectAssignments` - Query dữ liệu phân công
  - `useAssignProjectsToCouncil` - Mutation gán đề tài
  - `useUnassignProjectsFromCouncil` - Mutation bỏ gán
  - `useFinalizeCouncilProjectAssignments` - Mutation hoàn tất
- **UI Components**: Shadcn UI (Card, Select, Input, Checkbox, Table, Badge, Button)
- **Search**: Client-side filtering theo tên đề tài, tên sinh viên, mã sinh viên
- **Layout**: 2 cột (Chưa gán | Đã gán) với scroll độc lập

## Workflow tổng thể

```
[Trưởng Khoa chọn đợt APPROVED]
    ↓
[Hệ thống load hội đồng và đề tài]
    ↓
[Trưởng Khoa chọn hội đồng]
    ↓
[Xem đề tài chưa gán ← → Xem đề tài đã gán]
    ↓
[Gán đề tài] ←→ [Bỏ gán đề tài]
    ↓ (lặp lại cho đến khi hài lòng)
[Hoàn tất phân công toàn đợt]
    ↓
[Công bố cho hội đồng/GVHD/thành viên]
    ↓
[Không thể chỉnh sửa]
```
