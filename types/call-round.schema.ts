import { z } from "zod";

export const callRoundSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  templateId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCallRoundSchema = z.object({
  name: z.string().min(1, "Tên đợt đăng ký không được để trống"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true),
  templateId: z.string().nullable().optional(),
  departmentIds: z.array(z.string()).optional(),
  majorIds: z.array(z.string()).optional(),
  classIds: z.array(z.string()).optional(),
});

export const updateCallRoundSchema = createCallRoundSchema.partial();

export type CallRound = z.infer<typeof callRoundSchema>;
export type CreateCallRoundInput = z.infer<typeof createCallRoundSchema>;
export type UpdateCallRoundInput = z.infer<typeof updateCallRoundSchema>;

// CallRound with template relation (from API)
export type CallRoundWithTemplate = CallRound & {
  template?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    projects: number;
  };
};
