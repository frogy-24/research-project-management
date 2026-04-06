'use client';

// components/dean/room-management.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useRooms';
import { createRoomSchema, type CreateRoomInput, type RoomItem } from '@/types/room.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Pencil, Trash2, DoorOpen, Users, Building2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type RoomFormValues = z.input<typeof createRoomSchema>;

function RoomFormDialog({
  open,
  onOpenChange,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room?: RoomItem | null;
}) {
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const isEdit = !!room;

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: room?.name ?? '',
      code: room?.code ?? '',
      capacity: room?.capacity ?? undefined,
      description: room?.description ?? '',
      isActive: room?.isActive ?? true,
    },
  });

  // Reset khi mở lại dialog
  const handleOpenChange = (v: boolean) => {
    if (v) {
      form.reset({
        name: room?.name ?? '',
        code: room?.code ?? '',
        capacity: room?.capacity ?? undefined,
        description: room?.description ?? '',
        isActive: room?.isActive ?? true,
      });
    }
    onOpenChange(v);
  };

  const onSubmit = (data: RoomFormValues) => {
    const validatedData: CreateRoomInput = createRoomSchema.parse(data);

    if (isEdit && room) {
      updateRoom.mutate(
        { id: room.id, data: validatedData },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createRoom.mutate(validatedData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createRoom.isPending || updateRoom.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Cập nhật phòng họp' : 'Thêm phòng họp mới'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên phòng *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Phòng họp A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã phòng *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: B201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sức chứa (người)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="VD: 30"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mô tả thêm về phòng..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0 cursor-pointer">Đang hoạt động</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm phòng'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoomDialog({
  room,
  open,
  onOpenChange,
}: {
  room: RoomItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deleteRoom = useDeleteRoom();

  const handleConfirm = () => {
    if (!room) return;
    deleteRoom.mutate(room.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa phòng</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa phòng <strong>{room?.name}</strong> ({room?.code})? Hành động này
            không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteRoom.isPending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {deleteRoom.isPending ? 'Đang xóa...' : 'Xóa phòng'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RoomManagement() {
  const { data: rooms, isLoading } = useRooms();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [search, setSearch] = useState('');

  const filtered = (rooms ?? []).filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (room: RoomItem) => {
    setSelectedRoom(room);
    setFormOpen(true);
  };

  const handleDelete = (room: RoomItem) => {
    setSelectedRoom(room);
    setDeleteOpen(true);
  };

  const handleAdd = () => {
    setSelectedRoom(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DoorOpen className="h-7 w-7 text-blue-600" />
            Quản lý Phòng họp
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách phòng họp phục vụ lịch họp hướng dẫn và hội đồng đánh giá
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Thêm phòng
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng phòng</p>
              <p className="text-2xl font-bold text-slate-900">{rooms?.length ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <DoorOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Đang hoạt động</p>
              <p className="text-2xl font-bold text-slate-900">
                {rooms?.filter((r) => r.isActive).length ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng sức chứa</p>
              <p className="text-2xl font-bold text-slate-900">
                {rooms?.reduce((acc, r) => acc + (r.capacity ?? 0), 0) ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Tìm theo tên hoặc mã phòng..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[80px]">Mã</TableHead>
              <TableHead>Tên phòng</TableHead>
              <TableHead className="w-[120px]">Sức chứa</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="w-[120px]">Buổi họp</TableHead>
              <TableHead className="w-[100px]">Trạng thái</TableHead>
              <TableHead className="w-[120px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                  <DoorOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {search ? 'Không tìm thấy phòng phù hợp' : 'Chưa có phòng nào. Thêm phòng mới!'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((room) => (
                <TableRow key={room.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-sm font-semibold text-slate-700">
                    {room.code}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{room.name}</TableCell>
                  <TableCell>
                    {room.capacity ? (
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {room.capacity}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                    {room.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      {room._count?.officeMeetings ?? 0} buổi
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        room.isActive
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-100'
                      }
                    >
                      {room.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:text-blue-600"
                        onClick={() => handleEdit(room)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:text-rose-600"
                        onClick={() => handleDelete(room)}
                        disabled={(room._count?.officeMeetings ?? 0) > 0}
                        title={
                          (room._count?.officeMeetings ?? 0) > 0
                            ? 'Không thể xóa vì có buổi họp liên quan'
                            : 'Xóa phòng'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} room={selectedRoom} />
      <DeleteRoomDialog room={selectedRoom} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
