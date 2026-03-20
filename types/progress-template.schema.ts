import { z } from "zod";

// Template Item Schema
export const progressReportTemplateItemSchema = z.object({
  id: z.string().optional(),
  weekNumber: z.number().int().min(1),
  weekLabel: z.string().min(1, "Nhãn tuần không được để trống"),
  taskDescription: z.string().min(1, "Mô tả công việc không được để trống"),
  contentGuideline: z.string().optional(),
  expectedResult: z.string().optional(),
  orderIndex: z.number().int().min(0),
});

export type ProgressReportTemplateItem = z.infer<typeof progressReportTemplateItemSchema>;

// Template Schema
export const progressReportTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Tên biểu mẫu không được để trống"),
  description: z.string().optional(),
  isActive: z.boolean(),
  items: z.array(progressReportTemplateItemSchema).min(1, "Phải có ít nhất 1 mục"),
});

export type ProgressReportTemplate = z.infer<typeof progressReportTemplateSchema>;

// Create/Update Schemas
export const createTemplateSchema = progressReportTemplateSchema.omit({ id: true });
export const updateTemplateSchema = progressReportTemplateSchema.partial().required({ id: true });

export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>;
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>;

// Template with relations
export type TemplateWithItems = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    weekNumber: number;
    weekLabel: string;
    taskDescription: string;
    contentGuideline?: string | null;
    expectedResult?: string | null;
    orderIndex: number;
  }>;
};
