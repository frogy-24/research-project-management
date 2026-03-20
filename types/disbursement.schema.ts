import { z } from "zod";

export const disbursementSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  disbursedAt: z.coerce.date(),
  voucherNo: z.string().nullable().optional(),
  voucherFileUrl: z.string().url().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const createDisbursementSchema = disbursementSchema.omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export type FundingDisbursement = z.infer<typeof disbursementSchema>;
export type CreateDisbursementInput = z.infer<typeof createDisbursementSchema>;
