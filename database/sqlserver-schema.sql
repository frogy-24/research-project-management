-- ============================================
-- HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC
-- SQL Server Database Schema
-- ============================================

-- Drop existing tables (in reverse order of dependencies)
IF OBJECT_ID('OfficeMeetingView', 'U') IS NOT NULL DROP TABLE OfficeMeetingView;
IF OBJECT_ID('OfficeMeeting', 'U') IS NOT NULL DROP TABLE OfficeMeeting;
IF OBJECT_ID('Notification', 'U') IS NOT NULL DROP TABLE Notification;
IF OBJECT_ID('ExtensionRequest', 'U') IS NOT NULL DROP TABLE ExtensionRequest;
IF OBJECT_ID('FundingDisbursement', 'U') IS NOT NULL DROP TABLE FundingDisbursement;
IF OBJECT_ID('CouncilEvaluation', 'U') IS NOT NULL DROP TABLE CouncilEvaluation;
IF OBJECT_ID('ProgressReport', 'U') IS NOT NULL DROP TABLE ProgressReport;
IF OBJECT_ID('ProjectCouncilAssignment', 'U') IS NOT NULL DROP TABLE ProjectCouncilAssignment;
IF OBJECT_ID('CouncilMemberAssignment', 'U') IS NOT NULL DROP TABLE CouncilMemberAssignment;
IF OBJECT_ID('Council', 'U') IS NOT NULL DROP TABLE Council;
IF OBJECT_ID('CallRoundCouncilMember', 'U') IS NOT NULL DROP TABLE CallRoundCouncilMember;
IF OBJECT_ID('CallRoundInstructor', 'U') IS NOT NULL DROP TABLE CallRoundInstructor;
IF OBJECT_ID('ProjectRegistration', 'U') IS NOT NULL DROP TABLE ProjectRegistration;
IF OBJECT_ID('Project', 'U') IS NOT NULL DROP TABLE Project;
IF OBJECT_ID('ProjectType', 'U') IS NOT NULL DROP TABLE ProjectType;
IF OBJECT_ID('ProgressReportTemplateItem', 'U') IS NOT NULL DROP TABLE ProgressReportTemplateItem;
IF OBJECT_ID('ProgressReportTemplate', 'U') IS NOT NULL DROP TABLE ProgressReportTemplate;
IF OBJECT_ID('CallRound', 'U') IS NOT NULL DROP TABLE CallRound;
IF OBJECT_ID('[User]', 'U') IS NOT NULL DROP TABLE [User];
IF OBJECT_ID('Room', 'U') IS NOT NULL DROP TABLE Room;
IF OBJECT_ID('Class', 'U') IS NOT NULL DROP TABLE Class;
IF OBJECT_ID('Major', 'U') IS NOT NULL DROP TABLE Major;
IF OBJECT_ID('Department', 'U') IS NOT NULL DROP TABLE Department;
IF OBJECT_ID('CallRound_Department', 'U') IS NOT NULL DROP TABLE CallRound_Department;
IF OBJECT_ID('CallRound_Major', 'U') IS NOT NULL DROP TABLE CallRound_Major;
IF OBJECT_ID('CallRound_Class', 'U') IS NOT NULL DROP TABLE CallRound_Class;
GO

-- ============================================
-- ORGANIZATION TABLES
-- ============================================

-- Department (Khoa/Đơn vị)
CREATE TABLE Department (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Major (Ngành học)
CREATE TABLE Major (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    departmentId NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Major_Department FOREIGN KEY (departmentId) 
        REFERENCES Department(id) ON DELETE CASCADE
);

-- Class (Lớp học)
CREATE TABLE Class (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    majorId NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Class_Major FOREIGN KEY (majorId) 
        REFERENCES Major(id) ON DELETE CASCADE
);

-- Room (Phòng họp)
CREATE TABLE Room (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(50) NOT NULL,
    capacity INT,
    description NVARCHAR(MAX),
    departmentId NVARCHAR(50) NOT NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Room_Department FOREIGN KEY (departmentId) 
        REFERENCES Department(id) ON DELETE CASCADE,
    CONSTRAINT UQ_Room_Code_Department UNIQUE (code, departmentId)
);

-- ============================================
-- USER TABLE
-- ============================================

-- User (Người dùng)
CREATE TABLE [User] (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) UNIQUE,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255),
    dateOfBirth DATETIME2,
    gender NVARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    phone NVARCHAR(20),
    address NVARCHAR(MAX),
    role NVARCHAR(20) NOT NULL DEFAULT 'LECTURER' CHECK (role IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')),
    department NVARCHAR(255), -- Legacy field
    departmentId NVARCHAR(50),
    majorId NVARCHAR(50),
    classId NVARCHAR(50),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_User_Department FOREIGN KEY (departmentId) 
        REFERENCES Department(id),
    CONSTRAINT FK_User_Major FOREIGN KEY (majorId) 
        REFERENCES Major(id),
    CONSTRAINT FK_User_Class FOREIGN KEY (classId) 
        REFERENCES Class(id)
);

-- ============================================
-- PROGRESS REPORT TEMPLATE TABLES
-- ============================================

-- ProgressReportTemplate (Mẫu báo cáo tiến độ)
CREATE TABLE ProgressReportTemplate (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    isActive BIT NOT NULL DEFAULT 1,
    createdById NVARCHAR(50),
    createdByRole NVARCHAR(20) CHECK (createdByRole IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- ProgressReportTemplateItem (Chi tiết mẫu báo cáo)
CREATE TABLE ProgressReportTemplateItem (
    id NVARCHAR(50) PRIMARY KEY,
    templateId NVARCHAR(50) NOT NULL,
    weekNumber INT NOT NULL,
    weekLabel NVARCHAR(255) NOT NULL,
    taskDescription NVARCHAR(MAX) NOT NULL,
    contentGuideline NVARCHAR(MAX),
    expectedResult NVARCHAR(MAX),
    orderIndex INT NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_TemplateItem_Template FOREIGN KEY (templateId) 
        REFERENCES ProgressReportTemplate(id) ON DELETE CASCADE,
    CONSTRAINT UQ_TemplateItem_Week UNIQUE (templateId, weekNumber)
);

CREATE INDEX IX_TemplateItem_Order ON ProgressReportTemplateItem(templateId, orderIndex);

-- ============================================
-- CALL ROUND TABLES
-- ============================================

-- CallRound (Đợt đăng ký)
CREATE TABLE CallRound (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    registrationStartDate DATETIME2 NOT NULL,
    registrationEndDate DATETIME2 NOT NULL,
    projectStartDate DATETIME2,
    projectEndDate DATETIME2,
    reviewDeadline DATETIME2,
    reportingStartDate DATETIME2,
    startDate DATETIME2 NOT NULL, -- Legacy
    endDate DATETIME2 NOT NULL, -- Legacy
    maxProjects INT,
    budgetLimit DECIMAL(12, 2),
    requirements NVARCHAR(MAX),
    guidelines NVARCHAR(MAX),
    contactInfo NVARCHAR(MAX),
    isActive BIT NOT NULL DEFAULT 1,
    isLocked BIT NOT NULL DEFAULT 0,
    applicableFor NVARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (applicableFor IN ('STUDENT', 'LECTURER', 'BOTH')),
    approvalStatus NVARCHAR(30) NOT NULL DEFAULT 'APPROVED' CHECK (approvalStatus IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    createdById NVARCHAR(50),
    createdByRole NVARCHAR(20) CHECK (createdByRole IN ('STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER')),
    approvedById NVARCHAR(50),
    approvalNote NVARCHAR(MAX),
    approvedAt DATETIME2,
    templateId NVARCHAR(50),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_CallRound_Template FOREIGN KEY (templateId) 
        REFERENCES ProgressReportTemplate(id)
);

-- CallRound_Department (Many-to-Many)
CREATE TABLE CallRound_Department (
    callRoundId NVARCHAR(50) NOT NULL,
    departmentId NVARCHAR(50) NOT NULL,
    PRIMARY KEY (callRoundId, departmentId),
    CONSTRAINT FK_CallRoundDept_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE,
    CONSTRAINT FK_CallRoundDept_Department FOREIGN KEY (departmentId) 
        REFERENCES Department(id) ON DELETE CASCADE
);

-- CallRound_Major (Many-to-Many)
CREATE TABLE CallRound_Major (
    callRoundId NVARCHAR(50) NOT NULL,
    majorId NVARCHAR(50) NOT NULL,
    PRIMARY KEY (callRoundId, majorId),
    CONSTRAINT FK_CallRoundMajor_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE,
    CONSTRAINT FK_CallRoundMajor_Major FOREIGN KEY (majorId) 
        REFERENCES Major(id) ON DELETE CASCADE
);

-- CallRound_Class (Many-to-Many)
CREATE TABLE CallRound_Class (
    callRoundId NVARCHAR(50) NOT NULL,
    classId NVARCHAR(50) NOT NULL,
    PRIMARY KEY (callRoundId, classId),
    CONSTRAINT FK_CallRoundClass_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE,
    CONSTRAINT FK_CallRoundClass_Class FOREIGN KEY (classId) 
        REFERENCES Class(id) ON DELETE CASCADE
);

-- CallRoundInstructor (Giảng viên hướng dẫn được chỉ định)
CREATE TABLE CallRoundInstructor (
    id NVARCHAR(50) PRIMARY KEY,
    callRoundId NVARCHAR(50) NOT NULL,
    instructorId NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_CallRoundInstructor_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE,
    CONSTRAINT FK_CallRoundInstructor_User FOREIGN KEY (instructorId) 
        REFERENCES [User](id) ON DELETE CASCADE,
    CONSTRAINT UQ_CallRoundInstructor UNIQUE (callRoundId, instructorId)
);

CREATE INDEX IX_CallRoundInstructor_CallRound ON CallRoundInstructor(callRoundId);
CREATE INDEX IX_CallRoundInstructor_Instructor ON CallRoundInstructor(instructorId);

-- CallRoundCouncilMember (Thành viên hội đồng được chỉ định)
CREATE TABLE CallRoundCouncilMember (
    id NVARCHAR(50) PRIMARY KEY,
    callRoundId NVARCHAR(50) NOT NULL,
    councilMemberId NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_CallRoundCouncil_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE,
    CONSTRAINT FK_CallRoundCouncil_User FOREIGN KEY (councilMemberId) 
        REFERENCES [User](id) ON DELETE CASCADE,
    CONSTRAINT UQ_CallRoundCouncilMember UNIQUE (callRoundId, councilMemberId)
);

CREATE INDEX IX_CallRoundCouncil_CallRound ON CallRoundCouncilMember(callRoundId);
CREATE INDEX IX_CallRoundCouncil_Member ON CallRoundCouncilMember(councilMemberId);

-- ============================================
-- PROJECT TABLES
-- ============================================

-- ProjectType (Loại đề tài)
CREATE TABLE ProjectType (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL UNIQUE,
    budgetCap DECIMAL(12, 2),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Project (Đề tài)
CREATE TABLE Project (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) UNIQUE,
    title NVARCHAR(500) NOT NULL,
    objective NVARCHAR(MAX) NOT NULL,
    expectedOutput NVARCHAR(MAX),
    proposalFileUrl NVARCHAR(500),
    budgetRequested DECIMAL(12, 2),
    budgetApproved DECIMAL(12, 2),
    status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'DEAN_APPROVED', 'DEAN_REVISION', 'ADMIN_REVIEW', 'COUNCIL_EVALUATING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'SUSPENDED')),
    overdueReportCount INT NOT NULL DEFAULT 0,
    budgetSuspended BIT NOT NULL DEFAULT 0,
    leaderId NVARCHAR(50) NOT NULL,
    deanReviewerId NVARCHAR(50),
    instructorId NVARCHAR(50),
    callRoundId NVARCHAR(50),
    projectTypeId NVARCHAR(50),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Project_Leader FOREIGN KEY (leaderId) 
        REFERENCES [User](id),
    CONSTRAINT FK_Project_DeanReviewer FOREIGN KEY (deanReviewerId) 
        REFERENCES [User](id),
    CONSTRAINT FK_Project_Instructor FOREIGN KEY (instructorId) 
        REFERENCES [User](id),
    CONSTRAINT FK_Project_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id),
    CONSTRAINT FK_Project_ProjectType FOREIGN KEY (projectTypeId) 
        REFERENCES ProjectType(id)
);

-- ProjectRegistration (Đăng ký đề tài)
CREATE TABLE ProjectRegistration (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    callRoundId NVARCHAR(50),
    title NVARCHAR(500) NOT NULL,
    objective NVARCHAR(MAX) NOT NULL,
    expectedOutput NVARCHAR(MAX),
    teamMembers NVARCHAR(MAX), -- JSON
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'CANCELED', 'REJECTED')),
    cancelReason NVARCHAR(MAX),
    instructorId NVARCHAR(50),
    instructorStatus NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (instructorStatus IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    facultyStatus NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (facultyStatus IN ('PENDING', 'APPROVED', 'REJECTED')),
    facultyReviewerId NVARCHAR(50),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ProjectReg_User FOREIGN KEY (userId) 
        REFERENCES [User](id) ON DELETE CASCADE,
    CONSTRAINT FK_ProjectReg_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id),
    CONSTRAINT FK_ProjectReg_Instructor FOREIGN KEY (instructorId) 
        REFERENCES [User](id),
    CONSTRAINT FK_ProjectReg_FacultyReviewer FOREIGN KEY (facultyReviewerId) 
        REFERENCES [User](id)
);

-- ============================================
-- PROGRESS REPORT TABLE
-- ============================================

-- ProgressReport (Báo cáo tiến độ)
CREATE TABLE ProgressReport (
    id NVARCHAR(50) PRIMARY KEY,
    projectId NVARCHAR(50) NOT NULL,
    week INT,
    fromDate DATETIME2,
    toDate DATETIME2,
    tasks NVARCHAR(MAX),
    performedContent NVARCHAR(MAX),
    results NVARCHAR(MAX),
    reportContent NVARCHAR(MAX),
    periodLabel NVARCHAR(255) NOT NULL,
    summary NVARCHAR(MAX) NOT NULL,
    fileUrl NVARCHAR(500),
    mentorReview NVARCHAR(MAX),
    mentorScore FLOAT,
    submittedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ProgressReport_Project FOREIGN KEY (projectId) 
        REFERENCES Project(id) ON DELETE CASCADE
);

-- ============================================
-- COUNCIL TABLES
-- ============================================

-- Council (Hội đồng)
CREATE TABLE Council (
    id NVARCHAR(50) PRIMARY KEY,
    callRoundId NVARCHAR(50) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Council_CallRound FOREIGN KEY (callRoundId) 
        REFERENCES CallRound(id) ON DELETE CASCADE
);

CREATE INDEX IX_Council_CallRound ON Council(callRoundId);

-- CouncilMemberAssignment (Phân công thành viên hội đồng)
CREATE TABLE CouncilMemberAssignment (
    id NVARCHAR(50) PRIMARY KEY,
    councilId NVARCHAR(50) NOT NULL,
    councilMemberId NVARCHAR(50) NOT NULL,
    role NVARCHAR(100), -- Chủ tịch, Thư ký, Ủy viên
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_CouncilMember_Council FOREIGN KEY (councilId) 
        REFERENCES Council(id) ON DELETE CASCADE,
    CONSTRAINT FK_CouncilMember_User FOREIGN KEY (councilMemberId) 
        REFERENCES [User](id) ON DELETE CASCADE,
    CONSTRAINT UQ_CouncilMember UNIQUE (councilId, councilMemberId)
);

CREATE INDEX IX_CouncilMember_Council ON CouncilMemberAssignment(councilId);
CREATE INDEX IX_CouncilMember_Member ON CouncilMemberAssignment(councilMemberId);

-- ProjectCouncilAssignment (Phân công đề tài cho hội đồng)
CREATE TABLE ProjectCouncilAssignment (
    id NVARCHAR(50) PRIMARY KEY,
    councilId NVARCHAR(50) NOT NULL,
    projectRegistrationId NVARCHAR(50) NOT NULL UNIQUE, -- Mỗi đề tài chỉ thuộc 1 hội đồng
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ProjectCouncil_Council FOREIGN KEY (councilId) 
        REFERENCES Council(id) ON DELETE CASCADE,
    CONSTRAINT FK_ProjectCouncil_Registration FOREIGN KEY (projectRegistrationId) 
        REFERENCES ProjectRegistration(id) ON DELETE CASCADE
);

CREATE INDEX IX_ProjectCouncil_Council ON ProjectCouncilAssignment(councilId);

-- CouncilEvaluation (Đánh giá của hội đồng)
CREATE TABLE CouncilEvaluation (
    id NVARCHAR(50) PRIMARY KEY,
    projectId NVARCHAR(50) NOT NULL,
    councilMemberId NVARCHAR(50) NOT NULL,
    score INT NOT NULL,
    decision NVARCHAR(20) NOT NULL CHECK (decision IN ('PASS', 'NEED_REVISION', 'FAIL')),
    comment NVARCHAR(MAX),
    evaluatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Evaluation_Project FOREIGN KEY (projectId) 
        REFERENCES Project(id) ON DELETE CASCADE,
    CONSTRAINT FK_Evaluation_CouncilMember FOREIGN KEY (councilMemberId) 
        REFERENCES [User](id)
);

-- ============================================
-- FINANCIAL TABLES
-- ============================================

-- FundingDisbursement (Giải ngân)
CREATE TABLE FundingDisbursement (
    id NVARCHAR(50) PRIMARY KEY,
    projectId NVARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    disbursedAt DATETIME2 NOT NULL,
    voucherNo NVARCHAR(100),
    voucherFileUrl NVARCHAR(500),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Disbursement_Project FOREIGN KEY (projectId) 
        REFERENCES Project(id) ON DELETE CASCADE
);

-- ExtensionRequest (Yêu cầu gia hạn)
CREATE TABLE ExtensionRequest (
    id NVARCHAR(50) PRIMARY KEY,
    projectId NVARCHAR(50) NOT NULL,
    requestedMonths INT NOT NULL,
    reason NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    submittedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    reviewedAt DATETIME2,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Extension_Project FOREIGN KEY (projectId) 
        REFERENCES Project(id) ON DELETE CASCADE
);

-- ============================================
-- NOTIFICATION & MEETING TABLES
-- ============================================

-- Notification (Thông báo)
CREATE TABLE Notification (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    type NVARCHAR(50) NOT NULL CHECK (type IN ('PROJECT_STATUS_CHANGE', 'REGISTRATION_STATUS_CHANGE', 'PROGRESS_REPORT_SUBMITTED', 'PROGRESS_REPORT_REVIEWED', 'EXTENSION_REQUEST_SUBMITTED', 'EXTENSION_REQUEST_REVIEWED', 'CALL_ROUND_APPROVED', 'CALL_ROUND_REJECTED', 'INSTRUCTOR_ASSIGNED', 'DEAN_REVIEW_ASSIGNED', 'COUNCIL_EVALUATION_SUBMITTED', 'FUNDING_DISBURSED')),
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    link NVARCHAR(500),
    isRead BIT NOT NULL DEFAULT 0,
    metadata NVARCHAR(MAX), -- JSON
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    readAt DATETIME2,
    CONSTRAINT FK_Notification_User FOREIGN KEY (userId) 
        REFERENCES [User](id) ON DELETE CASCADE
);

CREATE INDEX IX_Notification_User_Read ON Notification(userId, isRead);
CREATE INDEX IX_Notification_User_Created ON Notification(userId, createdAt);

-- OfficeMeeting (Lịch họp)
CREATE TABLE OfficeMeeting (
    id NVARCHAR(50) PRIMARY KEY,
    projectId NVARCHAR(50) NOT NULL,
    instructorId NVARCHAR(50) NOT NULL,
    target NVARCHAR(20) NOT NULL, -- GROUP or LEADER
    memberUserIds NVARCHAR(MAX) NOT NULL, -- JSON array
    meetingAt DATETIME2 NOT NULL,
    location NVARCHAR(500) NOT NULL,
    roomId NVARCHAR(50),
    note NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Meeting_Project FOREIGN KEY (projectId) 
        REFERENCES Project(id) ON DELETE CASCADE,
    CONSTRAINT FK_Meeting_Instructor FOREIGN KEY (instructorId) 
        REFERENCES [User](id),
    CONSTRAINT FK_Meeting_Room FOREIGN KEY (roomId) 
        REFERENCES Room(id) ON DELETE SET NULL
);

CREATE INDEX IX_Meeting_Project ON OfficeMeeting(projectId);
CREATE INDEX IX_Meeting_Instructor ON OfficeMeeting(instructorId);
CREATE INDEX IX_Meeting_Room ON OfficeMeeting(roomId);

-- OfficeMeetingView (Trạng thái xem lịch họp)
CREATE TABLE OfficeMeetingView (
    id NVARCHAR(50) PRIMARY KEY,
    meetingId NVARCHAR(50) NOT NULL,
    userId NVARCHAR(50) NOT NULL,
    isRead BIT NOT NULL DEFAULT 0,
    readAt DATETIME2,
    CONSTRAINT FK_MeetingView_Meeting FOREIGN KEY (meetingId) 
        REFERENCES OfficeMeeting(id) ON DELETE CASCADE,
    CONSTRAINT FK_MeetingView_User FOREIGN KEY (userId) 
        REFERENCES [User](id) ON DELETE CASCADE,
    CONSTRAINT UQ_MeetingView UNIQUE (meetingId, userId)
);

CREATE INDEX IX_MeetingView_User ON OfficeMeetingView(userId);

GO

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

PRINT 'Database schema created successfully!';
PRINT 'Total tables: 23';
GO
