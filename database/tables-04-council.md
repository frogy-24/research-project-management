# MÔ TẢ CÁC BẢNG - NHÓM HỘI ĐỒNG & ĐÁNH GIÁ

## 1. Bảng Council (Hội đồng)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất của hội đồng |
| 2 | callRoundId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đợt đăng ký liên quan |
| 3 | name | NVARCHAR(255) | NOT NULL | Tên hội đồng (VD: Hội đồng 1, Hội đồng CNTT) |
| 4 | description | NVARCHAR(MAX) | | Mô tả về hội đồng |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian thành lập |
| 6 | updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian cập nhật |

**Foreign Keys:**
- `callRoundId` → `CallRound(id)` ON DELETE CASCADE

**Indexes:**
- `IX_Council_CallRound` ON (callRoundId)

---

## 2. Bảng CouncilMemberAssignment (Phân công thành viên hội đồng)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | councilId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Hội đồng |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Thành viên hội đồng |
| 4 | role | NVARCHAR(100) | | Vai trò (Chủ tịch, Thư ký, Ủy viên) |
| 5 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian phân công |

**Foreign Keys:**
- `councilId` → `Council(id)` ON DELETE CASCADE
- `councilMemberId` → `User(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(councilId, councilMemberId)` - Mỗi người chỉ tham gia 1 lần trong hội đồng

**Indexes:**
- `IX_CouncilMember_Council` ON (councilId)
- `IX_CouncilMember_Member` ON (councilMemberId)

---

## 3. Bảng ProjectCouncilAssignment (Phân công đề tài cho hội đồng)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | councilId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Hội đồng phụ trách |
| 3 | projectRegistrationId | NVARCHAR(50) | FOREIGN KEY, NOT NULL, UNIQUE | Đơn đăng ký đề tài |
| 4 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian phân công |

**Foreign Keys:**
- `councilId` → `Council(id)` ON DELETE CASCADE
- `projectRegistrationId` → `ProjectRegistration(id)` ON DELETE CASCADE

**Unique Constraints:**
- `projectRegistrationId` - Mỗi đề tài chỉ thuộc 1 hội đồng duy nhất

**Indexes:**
- `IX_ProjectCouncil_Council` ON (councilId)

**Lưu ý:**
- Một đề tài chỉ được phân cho 1 hội đồng duy nhất
- Một hội đồng có thể chấm nhiều đề tài

---

## 4. Bảng CouncilEvaluation (Đánh giá của hội đồng)

| STT | Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|-----|------------|--------------|-----------|-------|
| 1 | id | NVARCHAR(50) | PRIMARY KEY | Mã định danh duy nhất |
| 2 | projectId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Đề tài được đánh giá |
| 3 | councilMemberId | NVARCHAR(50) | FOREIGN KEY, NOT NULL | Thành viên hội đồng đánh giá |
| 4 | score | INT | NOT NULL | Điểm số (VD: 0-100) |
| 5 | decision | NVARCHAR(20) | NOT NULL, CHECK | Quyết định đánh giá |
| 6 | comment | NVARCHAR(MAX) | | Nhận xét chi tiết |
| 7 | evaluatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian đánh giá |
| 8 | createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Thời gian tạo bản ghi |

**Foreign Keys:**
- `projectId` → `Project(id)` ON DELETE CASCADE
- `councilMemberId` → `User(id)`

**Check Constraints:**
- `decision` IN ('PASS', 'NEED_REVISION', 'FAIL')

**Lưu ý:**
- Mỗi thành viên hội đồng có thể đánh giá nhiều đề tài
- Một đề tài được đánh giá bởi nhiều thành viên hội đồng
- Điểm cuối cùng thường là trung bình cộng của các thành viên

---

## Mối quan hệ giữa các bảng

```
CallRound (1) ----< (N) Council

Council (1) ----< (N) CouncilMemberAssignment
Council (1) ----< (N) ProjectCouncilAssignment

User (1) ----< (N) CouncilMemberAssignment
User (1) ----< (N) CouncilEvaluation

ProjectRegistration (1) ---- (1) ProjectCouncilAssignment

Project (1) ----< (N) CouncilEvaluation
```

---

## Quy trình nghiệp vụ

### 1. Thành lập hội đồng
- Tạo Council mới cho một CallRound
- Phân công thành viên vào hội đồng (CouncilMemberAssignment)
- Chỉ định vai trò cho từng thành viên (Chủ tịch, Thư ký, Ủy viên)

### 2. Phân công đề tài
- Gán các ProjectRegistration vào Council (ProjectCouncilAssignment)
- Mỗi đề tài chỉ thuộc 1 hội đồng duy nhất

### 3. Đánh giá đề tài
- Mỗi thành viên hội đồng chấm điểm độc lập (CouncilEvaluation)
- Hệ thống tính điểm trung bình
- Quyết định cuối cùng dựa trên điểm và nhận xét
