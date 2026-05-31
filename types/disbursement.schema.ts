import { z } from "zod";

// Enum cho trạng thái giải ngân
export const disbursementStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]);

// Schema đầy đủ cho FundingDisbursement
export const disbursementSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  disbursedAt: z.coerce.date(),
  voucherNo: z.string().nullable().optional(),
  voucherFileUrl: z.string().url().nullable().optional(),
  reason: z.string().nullable().optional(),
  status: disbursementStatusSchema.default("PENDING"),
  createdById: z.string().cuid(),
  approvedById: z.string().cuid().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  rejectionNote: z.string().nullable().optional(),
  paymentVoucherUrl: z.string().url().nullable().optional(),
  paidById: z.string().cuid().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  paymentNote: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Schema cho tạo mới giải ngân (Dean/Admin)
export const createDisbursementSchema = z.object({
  projectId: z.string().cuid("ID đề tài không hợp lệ"),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  disbursedAt: z.coerce.date(),
  voucherNo: z.string().optional(),
  voucherFileUrl: z
    .string()
    .url("URL file không hợp lệ")
    .refine((url) => /\.pdf(?:$|[?#])/i.test(url), 'Chứng từ phải là file PDF')
    .optional(),
  reason: z.string().min(10, "Lý do giải ngân phải có ít nhất 10 ký tự").optional(),
});

// Schema cho phê duyệt giải ngân (Admin)
export const approveDisbursementSchema = z.object({
  approvedAt: z.coerce.date().optional(),
});

// Schema cho từ chối giải ngân (Admin)
export const rejectDisbursementSchema = z.object({
  rejectionNote: z.string().min(10, "Ghi chú từ chối phải có ít nhất 10 ký tự"),
});

// Schema cho thanh toán giải ngân (Người giải ngân) — bắt buộc upload chứng từ PDF
export const payDisbursementSchema = z.object({
  paymentVoucherUrl: z
    .string()
    .url("URL chứng từ không hợp lệ")
    .refine((url) => /\.pdf(?:$|[?#])/i.test(url), "Chứng từ phải là file PDF"),
  paidAt: z.coerce.date().optional(),
  paymentNote: z.string().optional(),
});

// Schema cho cập nhật giải ngân (chỉ PENDING)
export const updateDisbursementSchema = createDisbursementSchema.partial();

// Schema cho query filters
export const disbursementFiltersSchema = z.object({
  projectId: z.string().cuid().optional(),
  status: disbursementStatusSchema.optional(),
  callRoundId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

// Types
export type DisbursementStatus = z.infer<typeof disbursementStatusSchema>;
export type FundingDisbursement = z.infer<typeof disbursementSchema>;
export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>;
export type ApproveDisbursementInput = z.infer<typeof approveDisbursementSchema>;
export type RejectDisbursementInput = z.infer<typeof rejectDisbursementSchema>;
export type PayDisbursementInput = z.infer<typeof payDisbursementSchema>;
export type UpdateDisbursementInput = z.infer<typeof updateDisbursementSchema>;
export type DisbursementFilters = z.infer<typeof disbursementFiltersSchema>;

// Extended type với relations
export type FundingDisbursementWithRelations = FundingDisbursement & {
  project?: {
    id: string;
    code: string | null;
    title: string;
    budgetApproved: number | null;
    callRoundId: string | null;
    callRound?: {
      id: string;
      name: string;
      createdById: string | null;
    } | null;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  paidBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};
