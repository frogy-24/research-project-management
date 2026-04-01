// hooks/useRooms.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { roomsApi } from '@/api/rooms';
import { type CreateRoomInput, type UpdateRoomInput } from '@/types/room.schema';

const QUERY_KEY = ['rooms'] as const;

export function useRooms() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: roomsApi.list,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoomInput) => roomsApi.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Đã thêm phòng "${data.name}" thành công`);
    },
    onError: () => {
      toast.error('Thêm phòng thất bại. Vui lòng thử lại.');
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomInput }) =>
      roomsApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`Đã cập nhật phòng "${data.name}" thành công`);
    },
    onError: () => {
      toast.error('Cập nhật phòng thất bại. Vui lòng thử lại.');
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Đã xóa phòng thành công');
    },
    onError: () => {
      toast.error('Xóa phòng thất bại. Phòng có thể đang được sử dụng.');
    },
  });
}
