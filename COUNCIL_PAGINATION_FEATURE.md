# Server-side Pagination cho Thành viên Hội đồng

## Tổng quan
Đã triển khai phân trang server-side cho trang quản lý thành viên hội đồng đánh giá ở `/dean/councils`. Thay vì tải tất cả thành viên hội đồng một lần, hệ thống giờ đây chỉ tải 10 thành viên mỗi trang, giúp cải thiện hiệu suất đáng kể khi có nhiều thành viên.

## Các thay đổi đã thực hiện

### 1. Backend API (`app/api/dean/council-members/route.ts`)
- ✅ Thêm parameters `page` và `limit` vào GET endpoint
- ✅ Sử dụng Prisma `skip` và `take` để phân trang
- ✅ Tính toán và trả về metadata phân trang:
  - `total`: Tổng số thành viên
  - `page`: Trang hiện tại
  - `limit`: Số item mỗi trang
  - `totalPages`: Tổng số trang

### 2. API Client (`api/council-members.ts`)
- ✅ Cập nhật interface `PaginationMetadata`
- ✅ Cập nhật `CouncilMembersResponse` để bao gồm `pagination`
- ✅ Thêm parameters `page` và `limit` vào `getByCallRound()`

### 3. React Hook (`hooks/useCouncilMembers.ts`)
- ✅ Thêm parameters `page` và `limit` vào `useCouncilMembers()`
- ✅ Cập nhật query key để cache đúng cho từng trang

### 4. UI Component (`components/dean/council-management.tsx`)
- ✅ Truyền `currentPage` và `itemsPerPage` vào hook
- ✅ Lấy `pagination` metadata từ API response
- ✅ Hiển thị số thành viên từ `pagination.total` thay vì `array.length`
- ✅ Tính toán số thứ tự dựa trên page và limit
- ✅ Hiển thị pagination controls với dữ liệu từ server
- ✅ Reset về trang 1 khi đổi call round

## Lợi ích

### 1. Hiệu suất
- **Trước**: Tải tất cả thành viên cùng lúc (có thể hàng trăm records)
- **Sau**: Chỉ tải 10 thành viên mỗi lần
- Giảm thời gian load trang ban đầu
- Giảm bandwidth sử dụng
- Giảm memory usage ở client

### 2. Trải nghiệm người dùng
- Trang load nhanh hơn
- Navigation mượt mà giữa các trang
- Hiển thị tổng số chính xác từ database
- UI responsive và nhẹ nhàng

### 3. Khả năng mở rộng
- Hệ thống có thể xử lý hàng ngàn thành viên mà không ảnh hưởng hiệu suất
- Dễ dàng thay đổi số item mỗi trang
- Chuẩn bị sẵn cho các tính năng search/filter trong tương lai

## Cấu trúc API Response

```typescript
{
  data: [
    {
      id: string,
      callRoundId: string,
      councilMemberId: string,
      createdAt: string,
      councilMember: {
        id: string,
        name: string,
        email: string,
        code?: string
      }
    },
    // ... more items
  ],
  pagination: {
    total: 45,        // Tổng số thành viên
    page: 1,          // Trang hiện tại
    limit: 10,        // Số item mỗi trang
    totalPages: 5     // Tổng số trang
  }
}
```

## Usage

### Từ phía client:
```typescript
const { data: councilData } = useCouncilMembers(callRoundId, page, limit);
const members = councilData?.data ?? [];
const pagination = councilData?.pagination;
```

### API Call:
```
GET /api/dean/council-members?callRoundId=xxx&page=1&limit=10
```

## Cấu hình

Có thể thay đổi số item mỗi trang bằng cách sửa `itemsPerPage` constant trong component:

```typescript
const itemsPerPage = 10; // Thay đổi số này để điều chỉnh items per page
```

## Testing

Để test tính năng:
1. Đăng nhập với role DEAN
2. Truy cập `/dean/councils`
3. Chọn một đợt đăng ký
4. Thêm nhiều thành viên (>10) để test pagination
5. Kiểm tra:
   - ✅ Chỉ hiển thị 10 items mỗi trang
   - ✅ Pagination controls hoạt động đúng
   - ✅ Số thứ tự tính đúng giữa các trang
   - ✅ Tổng số thành viên hiển thị chính xác
   - ✅ Reset về page 1 khi đổi call round

## Files đã thay đổi

1. `app/api/dean/council-members/route.ts` - Backend API với pagination
2. `api/council-members.ts` - API client với pagination params
3. `hooks/useCouncilMembers.ts` - Hook với pagination support
4. `components/dean/council-management.tsx` - UI với server-side pagination

## Ngày hoàn thành
23/03/2026
