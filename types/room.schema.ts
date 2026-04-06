// types/room.schema.ts
import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Tên phòng không được để trống').max(100),
  code: z
    .string()
    .min(1, 'Mã phòng không được để trống')
    .max(20)
    .regex(/^[A-Za-z0-9\-_]+$/, 'Mã phòng chỉ được chứa chữ cái, số, gạch ngang hoặc gạch dưới'),
  capacity: z
    .number()
    .int()
    .positive('Sức chứa phải lớn hơn 0')
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateRoomSchema = createRoomSchema.partial();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// Shape trả về từ API (include relations)
export interface RoomDepartment {
  id: string;
  name: string;
  code: string;
}

export interface RoomItem {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  departmentId: string;
  department: RoomDepartment;
  _count: {
    officeMeetings: number;
  };
  createdAt: string;
  updatedAt: string;
}
