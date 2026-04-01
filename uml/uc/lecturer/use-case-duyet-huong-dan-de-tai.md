# MÔ TẢ USE CASE: DUYỆT HƯỚNG DẪN ĐỀ TÀI

## Thông tin Use Case

| Mục | Tên yêu cầu | Mô tả yêu cầu |
|-----|-------------|---------------|
| 1 | **Tên use-case** | Duyệt hướng dẫn đề tài |
| 2 | **Tác nhân** | Giảng viên Hướng dẫn (Lecturer / Instructor) |
| 3 | **Mô tả** | Use-case này cho phép Giảng viên xem danh sách các đề tài mà sinh viên đã mời họ làm người hướng dẫn, sau đó quyết định chấp nhận hoặc từ chối. Khi sinh viên đăng ký đề tài và chọn giảng viên hướng dẫn, hệ thống tạo yêu cầu với trạng thái PENDING. Giảng viên có thể lọc, tìm kiếm, xem chi tiết và đưa ra quyết định. Quyết định này ảnh hưởng trực tiếp đến luồng duyệt đề tài |
| 4 | **Tiền điều kiện** | 1. Giảng viên đã đăng nhập vào hệ thống<br>2. Giảng viên có role = LECTURER<br>3. Sinh viên đã đăng ký đề tài và chọn giảng viên này làm người hướng dẫn<br>4. ProjectRegistration có instructorId = ID giảng viên<br>5. instructorStatus = PENDING (chưa được duyệt)<br>6. Đợt đăng ký đang mở hoặc đã đóng nhưng chưa xóa |
| 5 | **Hậu điều kiện** | **Sau khi chấp nhận (ACCEPTED):**<br>1. Cập nhật instructorStatus = ACCEPTED<br>2. Không thay đổi status đăng ký (vẫn PENDING)<br>3. Đề tài tiếp tục chờ Trưởng Khoa duyệt<br>4. Hệ thống gửi thông báo cho sinh viên<br>5. Giảng viên không thể thay đổi quyết định<br><br>**Sau khi từ chối (REJECTED):**<br>1. Cập nhật instructorStatus = REJECTED<br>2. Đồng thời cập nhật status = REJECTED<br>3. Đề tài bị từ chối hoàn toàn<br>4. Sinh viên phải đăng ký lại với GVHD khác<br>5. Đề tài không được chuyển lên Trưởng Khoa<br>6. Hệ thống gửi thông báo cho sinh viên<br>7. Giảng viên không thể thay đổi quyết định |
| 6 | **Luồng sự kiện chính** | **LUỒNG 1: XEM DANH SÁCH YÊU CẦU HƯỚNG DẪN**<br><br>**Bước 1: Truy cập trang**<br>1. Giảng viên đăng nhập vào hệ thống<br>2. Truy cập menu "Yêu cầu hướng dẫn" hoặc "Đề tài cần duyệt"<br>3. Hệ thống hiển thị tiêu đề trang<br>4. Hiển thị các bộ lọc và tìm kiếm<br><br>**Bước 2: Load dữ liệu**<br>5. Hệ thống gọi API GET /api/my-project-registrations/guidance<br>6. Backend lấy userId từ session<br>7. Backend kiểm tra role = LECTURER<br>8. Backend tìm tất cả ProjectRegistration có instructorId = userId<br>9. Backend join với User (sinh viên), CallRound, Class, Major, Department<br>10. Áp dụng các filter (nếu có):<br>&nbsp;&nbsp;&nbsp;• callRoundId: Lọc theo đợt<br>&nbsp;&nbsp;&nbsp;• instructorStatus: Lọc theo trạng thái<br>&nbsp;&nbsp;&nbsp;• search + searchField: Tìm kiếm<br>11. Sắp xếp theo createdAt desc (mới nhất trước)<br>12. Phân trang với page, limit<br>13. Trả về data + pagination info<br><br>**Bước 3: Hiển thị danh sách**<br>14. Hệ thống hiển thị bảng Table hoặc Card list<br>15. Mỗi đề tài hiển thị:<br>&nbsp;&nbsp;&nbsp;• Tên đề tài (title)<br>&nbsp;&nbsp;&nbsp;• Sinh viên: Tên, Mã, Email<br>&nbsp;&nbsp;&nbsp;• Lớp, Ngành, Khoa<br>&nbsp;&nbsp;&nbsp;• Đợt đăng ký (CallRound name)<br>&nbsp;&nbsp;&nbsp;• Trạng thái: Badge màu<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- PENDING: Vàng "Chờ duyệt"<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- ACCEPTED: Xanh "Đã chấp nhận"<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- REJECTED: Đỏ "Đã từ chối"<br>&nbsp;&nbsp;&nbsp;• Ngày đăng ký<br>&nbsp;&nbsp;&nbsp;• Thao tác: Nút "Xem chi tiết"<br>16. Hiển thị phân trang (Previous, 1, 2, 3..., Next)<br>17. Hiển thị tổng số: "Hiển thị X-Y trong Z kết quả"<br><br>**Bước 4: Sử dụng bộ lọc**<br>18. Giảng viên có thể:<br>&nbsp;&nbsp;&nbsp;• Chọn đợt đăng ký từ dropdown<br>&nbsp;&nbsp;&nbsp;• Chọn trạng thái: Tất cả / Chờ duyệt / Đã chấp nhận / Đã từ chối<br>&nbsp;&nbsp;&nbsp;• Nhập từ khóa tìm kiếm<br>&nbsp;&nbsp;&nbsp;• Chọn trường tìm kiếm: Tên đề tài / Tên SV / Email SV / Mã SV / Tất cả<br>19. Mỗi lần thay đổi filter, hệ thống gọi lại API<br>20. Danh sách được cập nhật theo filter<br><br>**LUỒNG 2: XEM CHI TIẾT ĐỀ TÀI**<br><br>**Bước 1: Mở chi tiết**<br>1. Giảng viên nhấn "Xem chi tiết" trên một đề tài<br>2. Hệ thống mở Dialog hoặc chuyển trang<br>3. Hiển thị đầy đủ thông tin đề tài<br><br>**Bước 2: Hiển thị thông tin đề tài**<br>4. **Thông tin cơ bản:**<br>&nbsp;&nbsp;&nbsp;• Tên đề tài (title)<br>&nbsp;&nbsp;&nbsp;• Mục tiêu (objective)<br>&nbsp;&nbsp;&nbsp;• Sản phẩm dự kiến (expectedOutput)<br>&nbsp;&nbsp;&nbsp;• Trạng thái hiện tại (instructorStatus)<br>5. **Thông tin sinh viên chủ trì:**<br>&nbsp;&nbsp;&nbsp;• Họ tên<br>&nbsp;&nbsp;&nbsp;• Mã sinh viên<br>&nbsp;&nbsp;&nbsp;• Email<br>&nbsp;&nbsp;&nbsp;• Lớp<br>&nbsp;&nbsp;&nbsp;• Ngành<br>&nbsp;&nbsp;&nbsp;• Khoa<br>6. **Thành viên nhóm (nếu có):**<br>&nbsp;&nbsp;&nbsp;• Parse JSON teamMembers<br>&nbsp;&nbsp;&nbsp;• Hiển thị danh sách thành viên<br>&nbsp;&nbsp;&nbsp;• Mỗi thành viên: Tên, Mã, Email, Vai trò<br>7. **Thông tin đợt đăng ký:**<br>&nbsp;&nbsp;&nbsp;• Tên đợt<br>&nbsp;&nbsp;&nbsp;• Thời gian đăng ký<br>&nbsp;&nbsp;&nbsp;• Ngày đề tài được tạo<br><br>**Bước 3: Hiển thị nút hành động**<br>8. Nếu instructorStatus = PENDING:<br>&nbsp;&nbsp;&nbsp;• Hiển thị 2 nút: "Chấp nhận" (xanh) và "Từ chối" (đỏ)<br>9. Nếu instructorStatus = ACCEPTED:<br>&nbsp;&nbsp;&nbsp;• Hiển thị Badge "Đã chấp nhận"<br>&nbsp;&nbsp;&nbsp;• Không có nút hành động<br>&nbsp;&nbsp;&nbsp;• Hiển thị thông báo: "Bạn đã chấp nhận hướng dẫn đề tài này"<br>10. Nếu instructorStatus = REJECTED:<br>&nbsp;&nbsp;&nbsp;• Hiển thị Badge "Đã từ chối"<br>&nbsp;&nbsp;&nbsp;• Không có nút hành động<br>&nbsp;&nbsp;&nbsp;• Hiển thị thông báo: "Bạn đã từ chối hướng dẫn đề tài này"<br><br>**LUỒNG 3: CHẤP NHẬN HƯỚNG DẪN**<br><br>**Bước 1: Nhấn nút Chấp nhận**<br>1. Giảng viên xem chi tiết đề tài PENDING<br>2. Nhấn nút "Chấp nhận"<br>3. Hệ thống hiển thị Confirm Dialog<br><br>**Bước 2: Xác nhận**<br>4. Dialog hiển thị:<br>&nbsp;&nbsp;&nbsp;• Tiêu đề: "Xác nhận chấp nhận"<br>&nbsp;&nbsp;&nbsp;• Nội dung: "Bạn có chắc chắn muốn chấp nhận hướng dẫn đề tài này? Sau khi chấp nhận, bạn không thể thay đổi quyết định."<br>&nbsp;&nbsp;&nbsp;• 2 nút: "Hủy" và "Xác nhận"<br>5. Giảng viên nhấn "Xác nhận"<br><br>**Bước 3: Gửi request**<br>6. Hệ thống gọi API PATCH /api/my-project-registrations/[id]/instructor-status<br>7. Payload: { status: "ACCEPTED" }<br>8. Backend lấy userId từ session<br>9. Backend tìm ProjectRegistration với id<br>10. Backend kiểm tra instructorId = userId<br>11. Backend kiểm tra instructorStatus = PENDING<br>12. Backend cập nhật:<br>&nbsp;&nbsp;&nbsp;• instructorStatus = ACCEPTED<br>&nbsp;&nbsp;&nbsp;• Không thay đổi status (vẫn PENDING)<br>13. Trả về status 200 OK<br><br>**Bước 4: Hiển thị kết quả**<br>14. Hệ thống hiển thị toast "Chấp nhận hướng dẫn thành công"<br>15. Đóng Dialog chi tiết<br>16. Refresh danh sách đề tài<br>17. Đề tài chuyển sang tab "Đã chấp nhận"<br>18. Badge chuyển sang màu xanh<br>19. Không còn nút "Chấp nhận" / "Từ chối"<br>20. Hệ thống gửi thông báo cho sinh viên<br>21. Đề tài chờ Trưởng Khoa duyệt tiếp<br><br>**LUỒNG 4: TỪ CHỐI HƯỚNG DẪN**<br><br>**Bước 1: Nhấn nút Từ chối**<br>1. Giảng viên xem chi tiết đề tài PENDING<br>2. Nhấn nút "Từ chối"<br>3. Hệ thống hiển thị Confirm Dialog<br><br>**Bước 2: Xác nhận**<br>4. Dialog hiển thị:<br>&nbsp;&nbsp;&nbsp;• Tiêu đề: "Xác nhận từ chối"<br>&nbsp;&nbsp;&nbsp;• Nội dung: "Bạn có chắc chắn muốn từ chối hướng dẫn đề tài này? Đề tài sẽ bị từ chối hoàn toàn và sinh viên phải đăng ký lại. Bạn không thể thay đổi quyết định sau này."<br>&nbsp;&nbsp;&nbsp;• Icon cảnh báo (màu đỏ)<br>&nbsp;&nbsp;&nbsp;• 2 nút: "Hủy" và "Xác nhận từ chối"<br>5. Giảng viên nhấn "Xác nhận từ chối"<br><br>**Bước 3: Gửi request**<br>6. Hệ thống gọi API PATCH /api/my-project-registrations/[id]/instructor-status<br>7. Payload: { status: "REJECTED" }<br>8. Backend lấy userId từ session<br>9. Backend tìm ProjectRegistration với id<br>10. Backend kiểm tra instructorId = userId<br>11. Backend kiểm tra instructorStatus = PENDING<br>12. Backend cập nhật:<br>&nbsp;&nbsp;&nbsp;• instructorStatus = REJECTED<br>&nbsp;&nbsp;&nbsp;• status = REJECTED (khác với ACCEPT)<br>13. Trả về status 200 OK<br><br>**Bước 4: Hiển thị kết quả**<br>14. Hệ thống hiển thị toast "Đã từ chối hướng dẫn"<br>15. Đóng Dialog chi tiết<br>16. Refresh danh sách đề tài<br>17. Đề tài chuyển sang tab "Đã từ chối"<br>18. Badge chuyển sang màu đỏ<br>19. Không còn nút "Chấp nhận" / "Từ chối"<br>20. Hệ thống gửi thông báo cho sinh viên<br>21. Đề tài không được chuyển lên Trưởng Khoa<br>22. Sinh viên phải đăng ký lại với GVHD khác |
| 7 | **Luồng sự kiện rẽ nhánh** | **A1. Chưa có yêu cầu nào**<br>1. Giảng viên truy cập trang<br>2. API trả về danh sách rỗng<br>3. Hiển thị thông báo: "Chưa có yêu cầu hướng dẫn nào"<br>4. Hiển thị icon và text hướng dẫn<br>5. Không hiển thị bảng<br><br>**A2. Lọc theo trạng thái PENDING**<br>1. Giảng viên chọn filter "Chờ duyệt"<br>2. API gọi với instructorStatus=PENDING<br>3. Chỉ hiển thị đề tài chưa duyệt<br>4. Giảng viên tập trung xử lý các yêu cầu mới<br><br>**A3. Lọc theo trạng thái ACCEPTED**<br>1. Giảng viên chọn filter "Đã chấp nhận"<br>2. API gọi với instructorStatus=ACCEPTED<br>3. Hiển thị danh sách đề tài đã chấp nhận<br>4. Giảng viên xem lại các đề tài đang hướng dẫn<br><br>**A4. Lọc theo trạng thái REJECTED**<br>1. Giảng viên chọn filter "Đã từ chối"<br>2. API gọi với instructorStatus=REJECTED<br>3. Hiển thị danh sách đề tài đã từ chối<br>4. Giảng viên xem lại lịch sử từ chối<br><br>**A5. Lọc theo đợt đăng ký**<br>1. Giảng viên chọn đợt từ dropdown<br>2. API gọi với callRoundId<br>3. Chỉ hiển thị đề tài của đợt đó<br>4. Giúp quản lý theo từng đợt<br><br>**A6. Tìm kiếm theo tên đề tài**<br>1. Giảng viên nhập từ khóa<br>2. Chọn searchField = "title"<br>3. API tìm kiếm trong trường title<br>4. Hiển thị kết quả khớp (case-insensitive)<br><br>**A7. Tìm kiếm theo tên sinh viên**<br>1. Giảng viên nhập tên sinh viên<br>2. Chọn searchField = "studentName"<br>3. API tìm kiếm trong user.name<br>4. Hiển thị đề tài của sinh viên đó<br><br>**A8. Tìm kiếm theo mã sinh viên**<br>1. Giảng viên nhập mã sinh viên<br>2. Chọn searchField = "studentCode"<br>3. API tìm kiếm trong user.code<br>4. Tìm chính xác theo mã<br><br>**A9. Tìm kiếm tất cả trường**<br>1. Giảng viên nhập từ khóa<br>2. Chọn searchField = "all" (mặc định)<br>3. API tìm trong: title, user.name, user.email, user.code<br>4. Hiển thị tất cả kết quả khớp<br><br>**A10. Phân trang**<br>1. Danh sách có nhiều hơn limit (10) bản ghi<br>2. Hiển thị nút phân trang<br>3. Giảng viên nhấn trang 2, 3...<br>4. API gọi với page=2, page=3...<br>5. Hiển thị dữ liệu trang tương ứng<br><br>**A11. Thay đổi số bản ghi/trang**<br>1. Giảng viên chọn limit = 20, 50, 100<br>2. API gọi với limit mới<br>3. Hiển thị nhiều bản ghi hơn trên 1 trang<br>4. Giảm số trang cần chuyển<br><br>**A12. Xem đề tài đã chấp nhận**<br>1. Giảng viên mở chi tiết đề tài ACCEPTED<br>2. Không có nút hành động<br>3. Chỉ xem thông tin<br>4. Có thể xem lại mục tiêu, sản phẩm<br><br>**A13. Xem đề tài đã từ chối**<br>1. Giảng viên mở chi tiết đề tài REJECTED<br>2. Không có nút hành động<br>3. Chỉ xem thông tin<br>4. Xem lại lý do (nếu có ghi chú)<br><br>**A14. Hủy xác nhận chấp nhận**<br>1. Giảng viên nhấn "Chấp nhận"<br>2. Confirm dialog hiển thị<br>3. Giảng viên nhấn "Hủy"<br>4. Dialog đóng, không thực hiện<br>5. Vẫn ở trạng thái PENDING<br><br>**A15. Hủy xác nhận từ chối**<br>1. Giảng viên nhấn "Từ chối"<br>2. Confirm dialog hiển thị<br>3. Giảng viên nhấn "Hủy"<br>4. Dialog đóng, không thực hiện<br>5. Vẫn ở trạng thái PENDING<br><br>**A16. Đề tài có nhiều thành viên**<br>1. Giảng viên xem chi tiết<br>2. teamMembers có nhiều người<br>3. Hiển thị danh sách đầy đủ<br>4. Mỗi thành viên trên một dòng<br>5. Giảng viên biết quy mô nhóm<br><br>**A17. Đề tài không có thành viên**<br>1. teamMembers = null hoặc []<br>2. Chỉ có sinh viên chủ trì<br>3. Hiển thị: "Đề tài cá nhân"<br>4. Không hiển thị phần thành viên nhóm |
| 8 | **Luồng sự kiện ngoại lệ** | **E1. Chưa đăng nhập**<br>1. Người dùng cố truy cập trang<br>2. Middleware kiểm tra session<br>3. Không tìm thấy session<br>4. Chuyển hướng về trang login<br>5. Yêu cầu đăng nhập<br><br>**E2. Không phải giảng viên**<br>1. Người dùng có role khác LECTURER<br>2. Cố truy cập trang hoặc gọi API<br>3. Backend kiểm tra role<br>4. Trả về 403 Forbidden<br>5. Hiển thị: "Bạn không có quyền truy cập"<br><br>**E3. Không phải người được chọn**<br>1. Giảng viên cố duyệt đề tài không phải của mình<br>2. Backend kiểm tra instructorId ≠ userId<br>3. Trả về 403 Forbidden<br>4. Hiển thị: "Bạn không có quyền cập nhật đề tài này"<br>5. Chỉ duyệt được đề tài mình được chọn<br><br>**E4. Đề tài đã được duyệt**<br>1. Giảng viên cố duyệt lại đề tài ACCEPTED hoặc REJECTED<br>2. Nút hành động đã bị ẩn<br>3. Nếu vẫn gọi API (qua console/hack)<br>4. Backend kiểm tra instructorStatus ≠ PENDING<br>5. Trả về lỗi: "Đề tài đã được duyệt"<br>6. Không cho phép thay đổi<br><br>**E5. Đề tài không tồn tại**<br>1. Giảng viên cố duyệt đề tài đã bị xóa<br>2. Backend không tìm thấy ProjectRegistration<br>3. Trả về 404 Not Found<br>4. Hiển thị: "Đề tài không tồn tại"<br>5. Quay về danh sách<br><br>**E6. Lỗi khi cập nhật**<br>1. Giảng viên gửi request hợp lệ<br>2. Backend gặp lỗi database<br>3. Trả về 500 Internal Server Error<br>4. Hiển thị toast: "Không thể cập nhật. Vui lòng thử lại"<br>5. Có thể thử lại<br><br>**E7. Phiên đăng nhập hết hạn**<br>1. Giảng viên đang xem danh sách<br>2. Session hết hạn<br>3. Nhấn nút "Chấp nhận" hoặc "Từ chối"<br>4. API trả về 401 Unauthorized<br>5. Chuyển hướng về trang login<br>6. Yêu cầu đăng nhập lại<br><br>**E8. Mất kết nối internet**<br>1. Giảng viên nhấn "Chấp nhận" hoặc "Từ chối"<br>2. Không có kết nối internet<br>3. Request timeout<br>4. Hiển thị: "Không thể kết nối. Kiểm tra internet"<br>5. Có thể thử lại sau<br><br>**E9. API chậm**<br>1. Giảng viên gửi request<br>2. API xử lý chậm (>5s)<br>3. Hiển thị loading spinner<br>4. Nút bị disable<br>5. Giảng viên phải đợi<br>6. Nếu quá 30s: Timeout<br><br>**E10. Lỗi khi load danh sách**<br>1. Giảng viên truy cập trang<br>2. API trả về lỗi (500, network error)<br>3. Hiển thị thông báo lỗi<br>4. Có nút "Thử lại"<br>5. Giảng viên nhấn để reload<br><br>**E11. Filter không hợp lệ**<br>1. Giảng viên nhập filter sai format<br>2. Backend validate<br>3. Bỏ qua filter không hợp lệ<br>4. Sử dụng giá trị mặc định<br>5. Vẫn trả về kết quả<br><br>**E12. Tìm kiếm không có kết quả**<br>1. Giảng viên nhập từ khóa<br>2. API tìm kiếm<br>3. Không có kết quả khớp<br>4. Hiển thị: "Không tìm thấy kết quả"<br>5. Gợi ý: "Thử từ khóa khác"<br><br>**E13. Trang không tồn tại**<br>1. Giảng viên nhập page > totalPages<br>2. Backend tính toán safePage<br>3. Tự động điều chỉnh về trang cuối<br>4. Hiển thị dữ liệu trang cuối<br>5. Không báo lỗi<br><br>**E14. Đề tài bị xóa trong lúc xem**<br>1. Giảng viên đang xem chi tiết<br>2. Admin xóa đề tài<br>3. Giảng viên nhấn "Chấp nhận"<br>4. API trả về 404<br>5. Hiển thị: "Đề tài không còn tồn tại"<br>6. Quay về danh sách<br><br>**E15. Status không hợp lệ**<br>1. Request gửi status khác ACCEPTED/REJECTED<br>2. Backend validate<br>3. Trả về 400 Bad Request<br>4. Hiển thị: "Trạng thái không hợp lệ"<br>5. Không cập nhật database |

## Sơ đồ Use Case

Xem file: `uml/uc/lecturer/instructor-approval-usecase.plantuml`

## Các bảng liên quan trong Database

1. **ProjectRegistration** - Đăng ký đề tài
   - `id`: ID đăng ký
   - `userId`: Sinh viên đăng ký
   - `instructorId`: Giảng viên hướng dẫn
   - `instructorStatus`: Trạng thái duyệt GVHD (PENDING/ACCEPTED/REJECTED)
   - `status`: Trạng thái đăng ký tổng thể (PENDING/APPROVED/REJECTED/CANCELED)
   - `title`: Tên đề tài
   - `objective`: Mục tiêu
   - `expectedOutput`: Sản phẩm dự kiến
   - `teamMembers`: Thành viên nhóm (JSON)
   - `callRoundId`: Đợt đăng ký
   - `facultyStatus`: Trạng thái duyệt Khoa
   - `facultyReviewerId`: Trưởng Khoa duyệt

2. **User** - Thông tin người dùng
   - `id`: ID người dùng
   - `name`: Họ tên
   - `email`: Email
   - `code`: Mã số
   - `role`: Vai trò (STUDENT, LECTURER)
   - `classId`: Lớp (cho sinh viên)
   - `majorId`: Ngành
   - `departmentId`: Khoa

3. **CallRound** - Đợt đăng ký
   - `id`: ID đợt
   - `name`: Tên đợt
   - `registrationStartDate`: Ngày bắt đầu
   - `registrationEndDate`: Ngày kết thúc
   - `isActive`: Đang hoạt động

4. **Class** - Lớp học
   - `id`: ID lớp
   - `name`: Tên lớp
   - `code`: Mã lớp

5. **Major** - Ngành học
   - `id`: ID ngành
   - `name`: Tên ngành
   - `code`: Mã ngành

6. **Department** - Khoa
   - `id`: ID khoa
   - `name`: Tên khoa
   - `code`: Mã khoa

## Quy tắc nghiệp vụ

1. Chỉ giảng viên được chọn làm instructorId mới có quyền duyệt
2. Chỉ duyệt được đề tài có instructorStatus = PENDING
3. Một khi đã duyệt (ACCEPTED hoặc REJECTED), không thể thay đổi
4. Khi REJECT: Cả instructorStatus và status đều chuyển sang REJECTED
5. Khi ACCEPT: Chỉ instructorStatus chuyển sang ACCEPTED, status vẫn PENDING
6. Đề tài REJECTED không được chuyển lên Trưởng Khoa
7. Đề tài ACCEPTED phải chờ Trưởng Khoa duyệt tiếp
8. Giảng viên có thể xem tất cả đề tài (PENDING, ACCEPTED, REJECTED)
9. Hỗ trợ lọc theo trạng thái và đợt đăng ký
10. Hỗ trợ tìm kiếm theo tên đề tài, tên sinh viên, email, mã sinh viên

## Ghi chú kỹ thuật

- **API Endpoints**: 
  - `GET /api/my-project-registrations/guidance` - Lấy danh sách yêu cầu hướng dẫn
  - `PATCH /api/my-project-registrations/[id]/instructor-status` - Cập nhật trạng thái duyệt
- **Query Parameters**:
  - `page`: Trang hiện tại (mặc định 1)
  - `limit`: Số bản ghi/trang (mặc định 10, max 100)
  - `callRoundId`: Lọc theo đợt
  - `instructorStatus`: Lọc theo trạng thái (PENDING/ACCEPTED/REJECTED)
  - `search`: Từ khóa tìm kiếm
  - `searchField`: Trường tìm kiếm (title/studentName/studentEmail/studentCode/all)
- **Authorization**:
  - Kiểm tra role = LECTURER
  - Kiểm tra instructorId = userId từ session
- **Validation**:
  - Status chỉ nhận ACCEPTED hoặc REJECTED
  - Không cho phép cập nhật nếu không phải người được chọn
- **Business Logic**:
  - REJECTED: Set cả instructorStatus và status
  - ACCEPTED: Chỉ set instructorStatus
- **Pagination**: Hỗ trợ phân trang với total, page, limit, totalPages

## Workflow tổng thể

```
[Giảng viên đăng nhập]
    ↓
[Truy cập "Yêu cầu hướng dẫn"]
    ↓
[Hệ thống load danh sách đề tài]
    ├─→ instructorId = Giảng viên
    ├─→ Hiển thị: PENDING / ACCEPTED / REJECTED
    └─→ Hỗ trợ: Lọc, Tìm kiếm, Phân trang
    ↓
[Giảng viên xem chi tiết đề tài]
    ├─→ Tên đề tài, Mục tiêu, Sản phẩm
    ├─→ Thông tin sinh viên (Tên, Mã, Email, Lớp)
    ├─→ Thành viên nhóm (nếu có)
    └─→ Đợt đăng ký
    ↓
[Giảng viên đưa ra quyết định]
    ├─→ CHẤP NHẬN
    │   ├─→ Confirm: "Bạn có chắc chắn chấp nhận hướng dẫn?"
    │   ├─→ PATCH API với status = ACCEPTED
    │   ├─→ instructorStatus = ACCEPTED
    │   ├─→ status vẫn PENDING
    │   ├─→ Gửi thông báo cho sinh viên
    │   └─→ Đề tài chờ Trưởng Khoa duyệt
    │
    └─→ TỪ CHỐI
        ├─→ Confirm: "Bạn có chắc chắn từ chối? Đề tài sẽ bị hủy."
        ├─→ PATCH API với status = REJECTED
        ├─→ instructorStatus = REJECTED
        ├─→ status = REJECTED
        ├─→ Gửi thông báo cho sinh viên
        └─→ Sinh viên phải đăng ký lại
    ↓
[Hiển thị kết quả]
    ├─→ Toast thông báo thành công
    ├─→ Refresh danh sách
    ├─→ Đề tài chuyển sang tab tương ứng
    └─→ Không thể thay đổi quyết định
```

