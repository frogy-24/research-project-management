# Mẫu quyết định phê duyệt đề tài (Trường Đại học X)

Mục tiêu: dùng file này để cung cấp dữ liệu đầu vào cho bot sinh văn bản Quyết định phê duyệt đề tài.

## 1) Mẫu văn bản quyết định

TRƯỜNG ĐẠI HỌC X  
Số: {{decisionNumber}}/QĐ-ĐHX

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM  
Độc lập - Tự do - Hạnh phúc  
----------------------------

{{decisionLocation}}, ngày {{decisionDay}} tháng {{decisionMonth}} năm {{decisionYear}}

# QUYẾT ĐỊNH
Về việc phê duyệt đề tài nghiên cứu khoa học {{subjectType}}

HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC X

- Căn cứ {{legalBasis1}};
- Căn cứ {{legalBasis2}};
- Căn cứ đề nghị của {{proposerUnit}}.

QUYẾT ĐỊNH:

Điều 1. Phê duyệt đề tài nghiên cứu khoa học với thông tin sau:

1. Mã đề tài: {{projectCode}}
2. Tên đề tài: {{projectTitle}}
3. Lĩnh vực/Loại đề tài: {{projectType}}
4. Chủ nhiệm đề tài (sinh viên): {{studentLeaderName}}
5. MSSV: {{studentLeaderCode}}
6. Lớp: {{studentClass}}
7. Khoa/Ngành: {{studentDepartmentMajor}}
8. Thành viên tham gia: {{teamMembersSummary}}
9. Giảng viên hướng dẫn: {{instructorName}} ({{instructorCode}})
10. Thời gian thực hiện: từ {{projectStartDate}} đến {{projectEndDate}}
11. Kinh phí phê duyệt: {{approvedBudget}}
12. Đợt/Đợt đăng ký: {{callRoundName}}

Điều 2. {{responsibilityClause}}

Điều 3. Quyết định này có hiệu lực kể từ ngày ký. Các đơn vị và cá nhân có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này.

Nơi nhận:
- {{receiver1}};
- {{receiver2}};
- Lưu: {{archiveUnit}}.

HIỆU TRƯỞNG  
(Ký, ghi rõ họ tên, đóng dấu)

{{signerName}}

## 2) Danh sách dữ liệu cần trích xuất cho bot

Bảng dưới đây ưu tiên theo dữ liệu đang có trong hệ thống hiện tại.

| Nhóm thông tin | Trường cần lấy | Gợi ý nguồn dữ liệu trong hệ thống | Bắt buộc |
|---|---|---|---|
| Thông tin quyết định | decisionNumber | Nhập tay theo số văn bản hành chính | Có |
| Thông tin quyết định | decisionDate (day/month/year) | Nhập tay hoặc ngày hiện tại | Có |
| Thông tin quyết định | decisionLocation | Nhập tay (ví dụ: Hà Nội) | Có |
| Căn cứ pháp lý | legalBasis1, legalBasis2 | Nhập tay theo quy định trường | Có |
| Đề tài | projectCode | Project.code | Nên có |
| Đề tài | projectTitle | Project.title hoặc ProjectRegistration.title | Có |
| Đề tài | projectType | Project.projectType.name | Nên có |
| Đề tài | objective | Project.objective hoặc ProjectRegistration.objective | Nên có |
| Đề tài | expectedOutput | Project.expectedOutput hoặc ProjectRegistration.expectedOutput | Không |
| Đợt đăng ký | callRoundName | Project.callRound.name hoặc ProjectRegistration.callRound.name | Có |
| Thời gian | projectStartDate, projectEndDate | Project.callRound.projectStartDate/projectEndDate | Có |
| Kinh phí | approvedBudget | Project.budgetApproved | Nên có |
| Sinh viên chủ nhiệm | studentLeaderName | Project.leader.name (hoặc User.name của hồ sơ đăng ký) | Có |
| Sinh viên chủ nhiệm | studentLeaderCode (MSSV) | Project.leader.code (hoặc User.code) | Có |
| Sinh viên chủ nhiệm | studentClass | User.class.name | Nên có |
| Sinh viên chủ nhiệm | studentDepartmentMajor | User.departmentRef.name + User.major.name | Nên có |
| Sinh viên chủ nhiệm | studentEmail, studentPhone | User.email, User.phone | Không |
| Thành viên | teamMembers[] | ProjectRegistration.teamMembers (JSON) | Không |
| Giảng viên hướng dẫn | instructorName | Project.instructor.name hoặc ProjectRegistration.instructor.name | Có |
| Giảng viên hướng dẫn | instructorCode | Project.instructor.code | Không |
| Người ký | signerName, signerTitle | Nhập tay theo phân quyền thực tế | Có |
| Điều khoản thi hành | responsibilityClause, receivers, archiveUnit | Nhập tay theo mẫu hành chính của trường | Có |

## 3) JSON đầu vào mẫu để gửi cho bot

```json
{
  "university": {
    "name": "Trường Đại học X",
    "location": "Hà Nội"
  },
  "decision": {
    "number": "123/QĐ-ĐHX",
    "date": "2026-04-18",
    "subjectType": "cấp trường",
    "legalBasis": [
      "Quy chế quản lý đề tài nghiên cứu khoa học sinh viên của Trường Đại học X",
      "Biên bản xét duyệt đề tài của Hội đồng khoa học ngày 15/04/2026"
    ],
    "proposerUnit": "Phòng Quản lý Khoa học"
  },
  "project": {
    "code": "SVNCKH-2026-015",
    "title": "Ứng dụng AI hỗ trợ quản lý đề tài nghiên cứu",
    "type": "Đề tài nghiên cứu khoa học sinh viên",
    "objective": "Xây dựng hệ thống hỗ trợ số hóa quy trình xét duyệt đề tài",
    "expectedOutput": "Báo cáo, source code, demo",
    "callRoundName": "Đợt 1 - Năm học 2025-2026",
    "startDate": "2026-05-01",
    "endDate": "2026-11-30",
    "budgetApproved": 25000000
  },
  "studentLeader": {
    "name": "Nguyễn Văn A",
    "studentCode": "SV001234",
    "className": "CNTT K66A",
    "departmentMajor": "Khoa CNTT / Ngành Kỹ thuật phần mềm",
    "email": "sv001234@univx.edu.vn",
    "phone": "0901234567"
  },
  "teamMembers": [
    {
      "name": "Trần Thị B",
      "role": "Thành viên",
      "studentCode": "SV001235"
    }
  ],
  "instructor": {
    "name": "TS. Lê Văn C",
    "code": "GV00088"
  },
  "execution": {
    "responsibilityClause": "Phòng Quản lý Khoa học, Khoa CNTT, giảng viên hướng dẫn và nhóm sinh viên có tên tại Điều 1 chịu trách nhiệm tổ chức thực hiện đề tài đúng tiến độ.",
    "receivers": [
      "Như Điều 3",
      "Phòng QLKH"
    ],
    "archiveUnit": "VT, QLKH"
  },
  "signer": {
    "name": "PGS.TS. Phạm Văn D",
    "title": "Hiệu trưởng"
  }
}
```

## 4) Prompt gợi ý để gọi bot tạo văn bản

Bạn hãy tạo file DOCX tên "quyet-dinh-phe-duyet-de-tai-{{projectCode}}.docx" theo văn phong hành chính Việt Nam, bố cục quyết định chuẩn (quốc hiệu, tiêu ngữ, căn cứ, điều khoản, nơi nhận, chữ ký), sử dụng chính xác dữ liệu từ JSON đầu vào. Không bịa thêm thông tin còn thiếu; nếu thiếu thì đánh dấu [CHƯA CÓ DỮ LIỆU].
