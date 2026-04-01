// api/rooms.ts
import { api } from '@/lib/axios';
import { type CreateRoomInput, type UpdateRoomInput, type RoomItem } from '@/types/room.schema';

export const roomsApi = {
  list: async (): Promise<RoomItem[]> => {
    const response = await api.get('/dean/rooms');
    return response.data;
  },

  getById: async (id: string): Promise<RoomItem> => {
    const response = await api.get(`/dean/rooms/${id}`);
    return response.data;
  },

  create: async (payload: CreateRoomInput): Promise<RoomItem> => {
    const response = await api.post('/dean/rooms', payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateRoomInput): Promise<RoomItem> => {
    const response = await api.put(`/dean/rooms/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/dean/rooms/${id}`);
  },
};
