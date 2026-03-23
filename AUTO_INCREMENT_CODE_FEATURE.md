# Auto-Increment Code Feature

## Tổng quan
Tính năng tự động tạo mã code tăng dần cho User (Giảng viên, Sinh viên) và Class (Lớp học).

## Các thành phần đã implement

### 1. Backend API Routes

#### `/api/users/next-code` (GET)
- **Mục đích**: Lấy mã code tiếp theo cho user theo role
- **Query params**: `role` (LECTURER | STUDENT)
- **Response**: `{ code: string }`
- **Logic**: 
  - Tìm user có code lớn nhất theo pattern `{PREFIX}{number}`
  - PREFIX: GV cho LECTURER, SV cho STUDENT
  - Tăng số lên 1 và pad 3 chữ số
  - VD: GV001 → GV002, SV099 → SV100

#### `/api/classes/next-code` (GET)
- **Mục đích**: Lấy mã code tiếp theo cho class
- **Response**: `{ code: string }`
- **Logic**:
  - Tìm class có code lớn nhất theo pattern `LOP{number}`
  - Tăng số lên 1 và pad 3 chữ số
  - VD: LOP001 → LOP002

### 2. API Client Functions

#### `userApi.getNextCode(role)` 
```typescript
// api/users.ts
getNextCode: async (role: 'LECTURER' | 'STUDENT') => {
    const response = await axios.get(`/api/users/next-code?role=${role}`);
    return response.data;
}
```

#### `classApi.getNextCode()`
```typescript
// api/classes.ts
getNextCode: async () => {
    const response = await axios.get('/api/classes/next-code');
    return response.data;
}
```

### 3. Component Updates

#### Lecturer Management (`components/dean/lecturer-management.tsx`)
- **Thay đổi**: 
  - `handleOpenCreate` → async function
  - Gọi `userApi.getNextCode('LECTURER')` khi mở dialog tạo mới
  - Input mã GV bị disabled khi tạo mới (`disabled={!editingId}`)
  - Placeholder đổi thành "VD: GV001"

#### Student Management (`components/dean/student-management.tsx`)
- **Thay đổi**:
  - `handleOpenCreate` → async function
  - Gọi `userApi.getNextCode('STUDENT')` khi mở dialog tạo mới
  - Input MSSV bị disabled khi tạo mới (`disabled={!editingId}`)
  - Placeholder đổi thành "VD: SV001"

#### Class Management (`components/dean/class-management.tsx`)
- **Thay đổi**:
  - `handleOpenDialog` → async function
  - Gọi `classApi.getNextCode()` khi mở dialog tạo mới
  - Input mã lớp bị disabled khi tạo mới (`disabled={!editingId}`)
  - Placeholder đổi thành "VD: LOP001"

## Quy tắc tạo mã

### User Code Format
- **Giảng viên**: `GV` + `001-999`
  - VD: GV001, GV002, ..., GV999
- **Sinh viên**: `SV` + `001-999`
  - VD: SV001, SV002, ..., SV999

### Class Code Format
- **Lớp học**: `LOP` + `001-999`
  - VD: LOP001, LOP002, ..., LOP999

## UX Flow

### Khi tạo mới (Create)
1. User click button "Thêm Giảng viên/Sinh viên/Lớp"
2. Dialog mở ra
3. Backend tự động gọi API để lấy mã code tiếp theo
4. Mã code được điền vào input và bị disabled (màu xám, không edit được)
5. User chỉ cần điền thông tin khác và submit

### Khi chỉnh sửa (Edit)
1. User click button "Sửa" trên một item
2. Dialog mở ra với dữ liệu hiện tại
3. Input mã code vẫn có thể edit (enabled)
4. User có thể sửa mã code nếu cần

## Lợi ích

1. **Tự động hóa**: Không cần nhập thủ công mã code
2. **Nhất quán**: Đảm bảo format mã code đồng nhất
3. **Tránh trùng lặp**: Luôn tạo mã mới duy nhất
4. **UX tốt**: Giảm công việc cho user khi tạo mới
5. **Linh hoạt**: Vẫn cho phép sửa mã khi edit

## Testing

### Test Cases
1. ✅ Tạo giảng viên mới → mã tự động GV001, GV002...
2. ✅ Tạo sinh viên mới → mã tự động SV001, SV002...
3. ✅ Tạo lớp mới → mã tự động LOP001, LOP002...
4. ✅ Edit giảng viên → có thể sửa mã GV
5. ✅ Edit sinh viên → có thể sửa mã SV
6. ✅ Edit lớp → có thể sửa mã LOP

## Mở rộng trong tương lai

- Có thể custom prefix theo department
- Có thể tăng độ dài số (từ 3 lên 4, 5 chữ số)
- Có thể thêm năm vào format: GV2026001
- Có thể reset số khi sang năm mới
