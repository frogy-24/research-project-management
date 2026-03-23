# External Council Member Feature

## Tính năng Thêm Thành viên Hội đồng Ngoài Khoa

### Mô tả
Tính năng này cho phép Trưởng khoa (DEAN) thêm thành viên hội đồng từ bên ngoài khoa (external members) bằng cách nhập thông tin thủ công.

### Các thành phần đã triển khai

#### 1. API Endpoint
- **File**: `app/api/dean/council-members/create-external/route.ts`
- **Method**: POST
- **Chức năng**:
  - Tạo thành viên hội đồng mới từ thông tin nhập thủ công
  - Kiểm tra email đã tồn tại chưa
  - Nếu user đã tồn tại, chỉ thêm vào hội đồng
  - Nếu chưa tồn tại, tạo user mới với role LECTURER
  - Tự động thêm vào hội đồng sau khi tạo

#### 2. API Client
- **File**: `api/council-members.ts`
- **Function**: `councilMembersApi.createExternal()`
- **Parameters**:
  - `callRoundId`: ID đợt đăng ký
  - `name`: Họ tên (bắt buộc)
  - `email`: Email (bắt buộc)
  - `phone`: Số điện thoại (tùy chọn)
  - `organization`: Đơn vị công tác (tùy chọn)

#### 3. React Hook
- **File**: `hooks/useCouncilMembers.ts`
- **Hook**: `useCreateExternalCouncilMember()`
- **Chức năng**:
  - Mutation hook để tạo external member
  - Tự động invalidate query để refresh danh sách
  - Toast notification khi thành công/thất bại

#### 4. UI Component
- **File**: `components/dean/council-management.tsx`
- **Thành phần**:
  - State management cho form external member
  - Dialog để nhập thông tin
  - Button "Tạo thành viên mới" bên cạnh "Thêm thành viên"
  - Form validation

### Luồng hoạt động

1. **Trưởng khoa mở dialog**:
   - Click button "Tạo thành viên mới"
   - Dialog hiện form nhập thông tin

2. **Nhập thông tin**:
   - Họ tên (bắt buộc)
   - Email (bắt buộc, phải hợp lệ)
   - Số điện thoại (tùy chọn)
   - Đơn vị (tùy chọn)

3. **Submit form**:
   - API kiểm tra email đã tồn tại
   - Nếu có: thêm user hiện tại vào hội đồng
   - Nếu không: tạo user mới → thêm vào hội đồng
   - Hiển thị thông báo thành công
   - Refresh danh sách thành viên

4. **Kết quả**:
   - Thành viên mới xuất hiện trong danh sách
   - Có thể xem trong các hội đồng sau khi chia
   - Có thể xóa như các thành viên khác

### Validation

- **Email**: 
  - Bắt buộc
  - Phải đúng định dạng email
  - Duy nhất trong hệ thống

- **Name**: 
  - Bắt buộc
  - Không được để trống

- **Phone & Organization**:
  - Tùy chọn
  - Có thể để trống

### Lưu ý kỹ thuật

1. External members được tạo với:
   - `role`: LECTURER
   - `code`: `EXT-{timestamp}`
   - `departmentId`: null (không thuộc khoa nào)

2. Nếu email đã tồn tại:
   - Không tạo user mới
   - Chỉ thêm vào hội đồng
   - Tránh duplicate

3. Auto-refresh:
   - Query invalidation tự động
   - Pagination được giữ nguyên
   - Toast notification

### Sử dụng

```typescript
// Trong CouncilManagement component
const createExternalMutation = useCreateExternalCouncilMember();

const handleCreateExternal = () => {
  createExternalMutation.mutate({
    callRoundId: selectedCallRoundId,
    name: externalMemberForm.name,
    email: externalMemberForm.email,
    phone: externalMemberForm.phone,
    organization: externalMemberForm.organization,
  }, {
    onSuccess: () => {
      toast.success('Đã tạo và thêm thành viên thành công');
      setIsCreateExternalDialogOpen(false);
      setExternalMemberForm({ name: '', email: '', phone: '', organization: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Lỗi khi tạo thành viên');
    },
  });
};
```

### Testing

1. Test tạo member mới
2. Test email đã tồn tại
3. Test validation (email invalid, name empty)
4. Test refresh danh sách sau khi tạo
5. Test xóa external member

### Future Enhancements

- Thêm field "Học vị" (degree)
- Thêm field "Chức danh" (title)
- Import nhiều members từ Excel
- Lưu lịch sử tham gia hội đồng
