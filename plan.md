# KẾ HOẠCH TRIỂN KHAI: CHỨC NĂNG CHẤM ĐIỂM ĐỀ TÀI CHO HỘI ĐỒNG

## 📋 TỔNG QUAN

### Mục tiêu
Thêm tab "Chấm điểm đề tài" cho Giảng viên có role COUNCIL, cho phép họ xem danh sách hội đồng mình tham gia và chấm điểm các đề tài được phân công.

### Phạm vi
- **Đối tượng**: Giảng viên (LECTURER) có thêm role COUNCIL
- **Chức năng chính**: 
  - Xem danh sách hội đồng đã tham gia
  - Xem danh sách đề tài trong mỗi hội đồng
  - Chấm điểm đề tài (score 0-100, decision, comment)
  - Xem lại điểm đã chấm

### Kiến trúc hiện tại
- Database: Đã có bảng `CouncilEvaluation` với đầy đủ schema
- API: Đã có endpoints `/api/projects/[id]/council-evaluations` (GET, POST)
- Hooks: Đã có `useCouncilEvaluations`, `useCreateCouncilEvaluation`
- Schema: Đã có `councilEvaluationSchema`, `createCouncilEvaluationSchema`
- Permissions: Đã có `canCreateCouncilEvaluation(role)`

---

## 🎯 PHÂN TÍCH YÊU CẦU

### 1. Yêu cầu nghiệp vụ (Business Requirements)

#### 1.1 Quyền truy cập
- Chỉ Giảng viên có role COUNCIL mới thấy tab "Chấm điểm"
- Kiểm tra role từ session: `session.role === 'COUNCIL'`

#### 1.2 Luồng nghiệp vụ
```
[Giảng viên COUNCIL đăng nhập]
    ↓
[Vào tab "Chấm điểm đề tài"]
    ↓
[Xem danh sách hội đồng mình tham gia]
    ↓
[Chọn hội đồng → Xem danh sách đề tài]
    ↓
[Kiểm tra trạng thái: Đã chấm / Chưa chấm]
    ↓
[Chọn đề tài chưa chấm → Mở form]
    ↓
[Nhập điểm (0-100) + Chọn quyết định + Nhận xét]
    ↓
[Xác nhận → Lưu vào CouncilEvaluation]
    ↓
[Đề tài chuyển sang "Đã chấm"]
```

#### 1.3 Quy tắc nghiệp vụ
- Mỗi thành viên chỉ chấm mỗi đề tài 1 lần duy nhất
- Điểm số: 0-100 (integer)
- Quyết định: PASS / NEED_REVISION / FAIL (bắt buộc)
- Nhận xét: Tùy chọn (nullable)
- Không thể sửa/xóa sau khi đã chấm

### 2. Yêu cầu kỹ thuật (Technical Requirements)

#### 2.1 API cần tạo mới
**GET /api/lecturer/councils**
- Mục đích: Lấy danh sách hội đồng mà giảng viên tham gia
- Input: Lấy userId từ session
- Output: Danh sách hội đồng với thông tin:
  - Council info (id, name, description, callRound)
  - Member role (Chủ tịch, Thư ký, Ủy viên)
  - Danh sách đề tài được phân công
  - Trạng thái chấm điểm của từng đề tài

**Response Schema:**
```typescript
{
  assignmentId: string;
  councilId: string;
  role: string;
  joinedAt: Date;
  council: {
    id: string;
    name: string;
    description: string;
    callRoundId: string;
    callRoundName: string;
    defenseDate: Date;
    defenseLocation: string;
    memberCount: number;
    projectCount: number;
    members: Array<{
      id: string;
      name: string;
      email: string;
      code: string;
      role: string;
    }>;
    projects: Array<{
      id: string;
      title: string;
      advisor: {
        id: string;
        name: string;
        email: string;
        code: string;
      };
      students: Array<{
        id: string;
        name: string;
        email: string;
        code: string;
        roleLabel: string;
      }>;
      myEvaluation: {
        id: string;
        score: number;
        decision: string;
        comment: string;
        evaluatedAt: Date;
      } | null;
    }>;
  };
}
```

#### 2.2 Components cần tạo

**1. Page Component**
- File: `app/lecturer/council-scoring/page.tsx`
- Server Component để check role và render client component

**2. Client Component**
- File: `components/lecturer/council-scoring-page.tsx`
- Hiển thị danh sách hội đồng
- Dialog chi tiết hội đồng với danh sách đề tài
- Form chấm điểm đề tài

**3. Form Component**
- File: `components/lecturer/council-evaluation-form.tsx`
- Form nhập điểm, chọn quyết định, nhập nhận xét
- Validation với react-hook-form + Zod
- Confirm dialog trước khi submit

#### 2.3 Hooks cần tạo

**useLecturerCouncils**
- File: `hooks/useLecturerCouncils.ts`
- Gọi API GET /api/lecturer/councils
- Return danh sách hội đồng với đầy đủ thông tin

#### 2.4 Schema Types

Sử dụng schema có sẵn:
- `councilEvaluationSchema` (đã có)
- `createCouncilEvaluationSchema` (đã có)

Cần thêm schema mới cho response:
- File: `types/council.schema.ts` (cập nhật)
- Thêm `lecturerCouncilItemSchema` cho response API

---

## 📐 THIẾT KẾ GIAO DIỆN (UI/UX)

### 1. Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: Giảng viên > Chấm điểm đề tài                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Hội đồng của tôi                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ STT │ Tên HĐ │ Đợt │ Vai trò │ Số ĐT │ Thao tác │  │
│  ├─────┼─────────┼─────┼─────────┼───────┼──────────┤  │
│  │  1  │ HĐ 1   │ 2024│ Ủy viên │  5/8  │ [Chi tiết]│  │
│  │  2  │ HĐ 2   │ 2024│ Chủ tịch│  3/6  │ [Chi tiết]│  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2. Dialog Chi tiết Hội đồng

```
┌─────────────────────────────────────────────────────────┐
│ ✕  Hội đồng 1 - Đợt 2024                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Vai trò: Ủy viên  │  Ngày bảo vệ: 15/05/2024           │
│  Nơi bảo vệ: Phòng A101                                 │
│                                                           │
│  📋 Danh sách đề tài (8)                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 1. Xây dựng hệ thống quản lý...                   │  │
│  │    GVHD: TS. Nguyễn Văn A                         │  │
│  │    SV: Trần Văn B (Nhóm trưởng)                   │  │
│  │    Trạng thái: ✅ Đã chấm (85/100 - Đạt)         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 2. Phát triển ứng dụng mobile...                  │  │
│  │    GVHD: PGS. Lê Thị C                            │  │
│  │    SV: Phạm Văn D (Nhóm trưởng)                   │  │
│  │    [Chấm điểm]                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3. Form Chấm điểm

```
┌─────────────────────────────────────────────────────────┐
│ ✕  Chấm điểm đề tài                                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Đề tài: Phát triển ứng dụng mobile...                  │
│  GVHD: PGS. Lê Thị C                                     │
│  SV: Phạm Văn D                                          │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Điểm số (0-100) *                               │    │
│  │ [________]                                       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Quyết định *                                     │    │
│  │ ○ Đạt  ○ Cần sửa đổi  ○ Không đạt              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Nhận xét (tùy chọn)                             │    │
│  │ [                                                ]    │
│  │ [                                                ]    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│              [Hủy]  [Gửi đánh giá]                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4. Design Tokens

**Colors:**
- Đã chấm: `emerald-500` (xanh lá)
- Chưa chấm: `amber-500` (vàng)
- PASS: `emerald-600`
- NEED_REVISION: `amber-600`
- FAIL: `rose-600`

**Typography:**
- Font: Inter / Geist Sans
- Heading: font-semibold
- Body: font-normal

**Spacing:**
- Card padding: p-6
- Form gap: space-y-4
- Button gap: gap-2

---

## 🔧 IMPLEMENTATION PLAN (Kế hoạch triển khai)

### Phase 1: Backend API (30 phút)

#### Step 1.1: Tạo API Route
**File:** `app/api/lecturer/councils/route.ts`

```typescript
// Nhiệm vụ:
// 1. Kiểm tra role COUNCIL từ session
// 2. Query CouncilMemberAssignment để lấy hội đồng
// 3. Include: Council, CallRound, Members, Projects
// 4. Với mỗi project, check xem đã chấm chưa (CouncilEvaluation)
// 5. Format response theo schema
```

**Prisma Query:**
```typescript
const assignments = await prisma.councilMemberAssignment.findMany({
  where: {
    councilMemberId: actorUserId,
  },
  include: {
    council: {
      include: {
        callRound: true,
        members: {
          include: {
            councilMember: true,
          },
        },
        projects: {
          include: {
            projectRegistration: {
              include: {
                project: {
                  include: {
                    instructor: true,
                    leader: true,
                    members: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    },
  },
});

// Sau đó với mỗi project, query CouncilEvaluation
const evaluation = await prisma.councilEvaluation.findFirst({
  where: {
    projectId: project.id,
    councilMemberId: actorUserId,
  },
});
```

#### Step 1.2: Cập nhật Schema Types
**File:** `types/council.schema.ts`

```typescript
// Thêm schema cho lecturer councils response
export const lecturerCouncilProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  advisor: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    code: z.string().nullable(),
  }).nullable(),
  students: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    code: z.string().nullable(),
    roleLabel: z.string(),
  })),
  myEvaluation: councilEvaluationSchema.nullable(),
});

export const lecturerCouncilItemSchema = z.object({
  assignmentId: z.string(),
  councilId: z.string(),
  role: z.string().nullable(),
  joinedAt: z.coerce.date(),
  council: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    callRoundId: z.string(),
    callRoundName: z.string(),
    defenseDate: z.coerce.date().nullable(),
    defenseLocation: z.string().nullable(),
    memberCount: z.number(),
    projectCount: z.number(),
    members: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      code: z.string().nullable(),
      role: z.string().nullable(),
    })),
    projects: z.array(lecturerCouncilProjectSchema),
  }),
});

export type LecturerCouncilItem = z.infer<typeof lecturerCouncilItemSchema>;
```

### Phase 2: Frontend Hooks & API Client (15 phút)

#### Step 2.1: Tạo API Client
**File:** `api/lecturer-councils.ts`

```typescript
import { api } from '@/lib/axios';
import { lecturerCouncilItemSchema, type LecturerCouncilItem } from '@/types/council.schema';
import { z } from 'zod';

const lecturerCouncilListSchema = z.array(lecturerCouncilItemSchema);

export const lecturerCouncilsApi = {
  getAll: async (): Promise<LecturerCouncilItem[]> => {
    const response = await api.get('/lecturer/councils');
    return lecturerCouncilListSchema.parse(response.data.data);
  },
};
```

#### Step 2.2: Tạo Hook
**File:** `hooks/useLecturerCouncils.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { lecturerCouncilsApi } from '@/api/lecturer-councils';

export const useLecturerCouncils = () => {
  return useQuery({
    queryKey: ['lecturer-councils'],
    queryFn: lecturerCouncilsApi.getAll,
  });
};
```

### Phase 3: UI Components (60 phút)

#### Step 3.1: Tạo Form Component
**File:** `components/lecturer/council-evaluation-form.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCouncilEvaluationSchema } from '@/types/council-evaluation.schema';
import { useCreateCouncilEvaluation } from '@/hooks/useProjectOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Component implementation...
```

#### Step 3.2: Tạo Main Client Component
**File:** `components/lecturer/council-scoring-page.tsx`

```typescript
'use client';

import { useMemo, useState } from 'react';
import { useLecturerCouncils } from '@/hooks/useLecturerCouncils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CouncilEvaluationForm } from './council-evaluation-form';
import { ClipboardCheck } from 'lucide-react';

// Component implementation...
```

#### Step 3.3: Tạo Page Component
**File:** `app/lecturer/council-scoring/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { CouncilScoringPage } from '@/components/lecturer/council-scoring-page';

export default async function LecturerCouncilScoringPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Check if user has COUNCIL role
  if (session.role !== 'COUNCIL') {
    redirect('/lecturer/profile');
  }

  return <CouncilScoringPage />;
}
```

### Phase 4: Navigation & Routing (15 phút)

#### Step 4.1: Cập nhật Sidebar
**File:** `components/layout/app-shell.tsx`

Thêm menu item cho LECTURER có role COUNCIL:

```typescript
// Trong function AppSidebar, thêm vào phần LECTURER menu:
{session.role === 'COUNCIL' && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={pathname === '/lecturer/council-scoring'}>
      <Link href="/lecturer/council-scoring">
        <ClipboardCheck className="h-4 w-4" />
        <span>Chấm điểm đề tài</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

### Phase 5: Testing & Validation (30 phút)

#### Test Cases:

**1. API Testing**
- [ ] GET /api/lecturer/councils trả về đúng danh sách
- [ ] Response có đầy đủ thông tin council, projects, evaluations
- [ ] Chỉ trả về councils mà user tham gia
- [ ] myEvaluation null khi chưa chấm, có data khi đã chấm

**2. UI Testing**
- [ ] Tab "Chấm điểm" chỉ hiện với role COUNCIL
- [ ] Danh sách hội đồng hiển thị đúng
- [ ] Dialog chi tiết mở đúng
- [ ] Form validation hoạt động (điểm 0-100, quyết định bắt buộc)
- [ ] Submit thành công, toast hiển thị
- [ ] Sau submit, đề tài chuyển sang "Đã chấm"
- [ ] Không thể chấm lại đề tài đã chấm

**3. Permission Testing**
- [ ] LECTURER không có COUNCIL role không thấy tab
- [ ] Không thể chấm đề tài không thuộc hội đồng mình
- [ ] Không thể chấm lại đề tài đã chấm

**4. Edge Cases**
- [ ] Hội đồng chưa có đề tài
- [ ] Tất cả đề tài đã chấm
- [ ] Điểm số âm/lớn hơn 100
- [ ] Không chọn quyết định
- [ ] Session hết hạn khi đang nhập form

---

## 📝 CHECKLIST TRIỂN KHAI

### Backend
- [ ] Tạo file `app/api/lecturer/councils/route.ts`
- [ ] Implement GET handler với Prisma query
- [ ] Kiểm tra permission (role COUNCIL)
- [ ] Format response theo schema
- [ ] Test API với Postman/Thunder Client

### Types & Schema
- [ ] Cập nhật `types/council.schema.ts`
- [ ] Thêm `lecturerCouncilProjectSchema`
- [ ] Thêm `lecturerCouncilItemSchema`
- [ ] Export types

### API Client & Hooks
- [ ] Tạo `api/lecturer-councils.ts`
- [ ] Tạo `hooks/useLecturerCouncils.ts`
- [ ] Test hook với React Query DevTools

### Components
- [ ] Tạo `components/lecturer/council-evaluation-form.tsx`
- [ ] Implement form với react-hook-form + Zod
- [ ] Thêm confirm dialog
- [ ] Tạo `components/lecturer/council-scoring-page.tsx`
- [ ] Implement table danh sách hội đồng
- [ ] Implement dialog chi tiết
- [ ] Integrate form vào dialog

### Pages & Routing
- [ ] Tạo `app/lecturer/council-scoring/page.tsx`
- [ ] Check permission server-side
- [ ] Cập nhật sidebar menu trong `app-shell.tsx`
- [ ] Test navigation

### Testing
- [ ] Test API endpoints
- [ ] Test UI components
- [ ] Test permissions
- [ ] Test edge cases
- [ ] Test responsive design

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Chạy `pnpm build` để kiểm tra lỗi TypeScript
- [ ] Chạy `pnpm lint` để kiểm tra code style
- [ ] Test trên môi trường development
- [ ] Kiểm tra database migrations (nếu có)
- [ ] Review code với team
- [ ] Merge vào branch chính
- [ ] Deploy lên production

---

## 📚 TÀI LIỆU THAM KHẢO

- Use Case: `uml/uc/council/use-case-cham-diem-de-tai.md`
- Database Schema: `database/tables-04-council.md`
- Existing API: `app/api/projects/[id]/council-evaluations/route.ts`
- Existing Hooks: `hooks/useProjectOperations.ts`
- Existing Schema: `types/council-evaluation.schema.ts`

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Security**: Luôn lấy `councilMemberId` từ session, không từ request body
2. **Validation**: Sử dụng Zod cho mọi input validation
3. **Type Safety**: Không sử dụng `any`, luôn define types chặt chẽ
4. **Error Handling**: Xử lý đầy đủ các trường hợp lỗi (401, 403, 404, 409, 500)
5. **UX**: Hiển thị loading state, toast notification, confirm dialog
6. **Performance**: Sử dụng React Query để cache data
7. **Accessibility**: Đảm bảo form có labels, aria-labels đầy đủ

---

## 🎨 UI/UX GUIDELINES

- **Loading State**: Hiển thị skeleton khi đang tải
- **Empty State**: Thông báo rõ ràng khi chưa có dữ liệu
- **Success State**: Toast "Gửi đánh giá thành công"
- **Error State**: Toast với thông báo lỗi cụ thể
- **Confirmation**: Dialog xác nhận trước khi submit
- **Disabled State**: Disable nút submit khi đang xử lý
- **Badge Colors**: Sử dụng màu phù hợp cho từng trạng thái

---

## 📊 ESTIMATED TIME

- **Backend API**: 30 phút
- **Types & Hooks**: 15 phút
- **UI Components**: 60 phút
- **Navigation**: 15 phút
- **Testing**: 30 phút

**Tổng thời gian ước tính**: ~2.5 giờ

---

## ✅ DEFINITION OF DONE

- [ ] Code compiles không lỗi TypeScript
- [ ] Tất cả test cases pass
- [ ] UI responsive trên mobile/tablet/desktop
- [ ] Permissions hoạt động đúng
- [ ] Error handling đầy đủ
- [ ] Loading states hiển thị đúng
- [ ] Toast notifications hoạt động
- [ ] Code được review và approved
- [ ] Documentation được cập nhật

---

**Người lập kế hoạch**: AI Assistant  
**Ngày tạo**: 13/04/2026  
**Phiên bản**: 1.0
