import { z } from "zod";

export const RoleEnum = z.enum([
  "STUDENT",
  "LECTURER",
  "DEAN",
  "ADMIN",
  "COUNCIL",
  "LEADER",
  "DISBURSER",
]);

export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

export const userSchema = z.object({
  id: z.string().cuid(),
  code: z.string().nullable().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: GenderEnum.nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: RoleEnum,
  department: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  majorId: z.string().nullable().optional(),
  classId: z.string().nullable().optional(),
  departmentRef: z.any().optional(),
  major: z.any().optional(),
  class: z.any().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AcademicRankEnum = z.enum([
  "BACHELOR",
  "MASTER",
  "DOCTOR",
  "DOCTOR_OF_SCIENCE",
  "ASSOCIATE_PROFESSOR",
  "PROFESSOR",
]);

const LecturerEmploymentTypeEnum = z.enum(["FULL_TIME", "ADJUNCT"]);
const LecturerWorkingStatusEnum = z.enum(["ACTIVE", "RETIRED", "RESIGNED"]);

const lecturerProfileSchema = z.object({
  staffId: z.string().nullable().optional(),
  academicRank: AcademicRankEnum.nullable().optional(),
  positionTitle: z.string().nullable().optional(),
  workStartDate: z.coerce.date().nullable().optional(),
  yearsOfService: z.coerce.number().int().nonnegative().nullable().optional(),
  teachingExperience: z.string().nullable().optional(),
  coursesTaught: z.string().nullable().optional(),
  teachingYears: z.coerce.number().int().nonnegative().nullable().optional(),
  trainingSystem: z.string().nullable().optional(),
  pedagogyCertificate: z.string().nullable().optional(),
  workHistory: z.string().nullable().optional(),
  degreeName: z.string().nullable().optional(),
  degreeMajor: z.string().nullable().optional(),
  degreeInstitution: z.string().nullable().optional(),
  degreeCountry: z.string().nullable().optional(),
  degreeYear: z.coerce.number().int().nonnegative().nullable().optional(),
  degreeScanUrl: z.string().nullable().optional(),
  academicTitleYear: z.coerce.number().int().nonnegative().nullable().optional(),
  academicTitleDecision: z.string().nullable().optional(),
  academicTitleProofUrl: z.string().nullable().optional(),
  organizationMajor: z.string().nullable().optional(),
  positionRole: z.string().nullable().optional(),
  lecturerType: LecturerEmploymentTypeEnum.nullable().optional(),
  civilServantCode: z.string().nullable().optional(),
  civilServantGrade: z.string().nullable().optional(),
  workingStatus: LecturerWorkingStatusEnum.nullable().optional(),
  joinedAt: z.coerce.date().nullable().optional(),
  departmentName: z.string().nullable().optional(),
  facultyName: z.string().nullable().optional(),
  customResearchFields: z.array(z.object({
    label: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
  })).optional(),
});

export const createUserSchema = userSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    lecturerProfile: lecturerProfileSchema.optional(),
  });

export type User = z.infer<typeof userSchema>;
export type Role = z.infer<typeof RoleEnum>;
export type Gender = z.infer<typeof GenderEnum>;
