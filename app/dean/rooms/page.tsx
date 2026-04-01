// app/dean/rooms/page.tsx
import { RoomManagement } from '@/components/dean/room-management';

export const metadata = {
  title: 'Quản lý Phòng họp | Dean Portal',
  description: 'Quản lý danh sách phòng họp phục vụ hội đồng và lịch hướng dẫn',
};

export default function DeanRoomsPage() {
  return <RoomManagement />;
}
