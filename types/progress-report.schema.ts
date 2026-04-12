import { z } from "zod";

const uploadedFileUrlSchema = z
  .string()
  .refine(
    (value) => {
      if (value.startsWith("/uploads/")) {
        return true;
      }

      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "URL file không hợp lệ" }
  );

export const progressReportSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  week: z.number().int().positive().nullable().optional(),
  fromDate: z.coerce.date().nullable().optional(),
  toDate: z.coerce.date().nullable().optional(),
  tasks: z.string().nullable().optional(),
  performedContent: z.string().nullable().optional(),
  results: z.string().nullable().optional(),
  reportContent: z.string().nullable().optional(),
  periodLabel: z.string().min(1),
  summary: z.string().min(1),
  fileUrl: uploadedFileUrlSchema.nullable().optional(),
  mentorReview: z.string().nullable().optional(),
  mentorScore: z.number().min(0).max(100).nullable().optional(),
  submittedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createProgressReportSchema = progressReportSchema.omit({
  id: true,
  projectId: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type ProgressReport = z.infer<typeof progressReportSchema>;
export type CreateProgressReportInput = z.infer<typeof createProgressReportSchema>;

export const reviewProgressReportSchema = z.object({
  mentorReview: z.string().min(1, "Vui lòng nhập nhận xét"),
  mentorScore: z.number().min(0).max(10, "Điểm tối đa là 10"),
});

export type ReviewProgressReportInput = z.infer<typeof reviewProgressReportSchema>;
