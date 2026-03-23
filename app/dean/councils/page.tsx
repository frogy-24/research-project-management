import { CouncilManagement } from '@/components/dean/council-management';

export const metadata = {
    title: 'Quản lý Hội đồng | Dean Portal',
    description: 'Quản lý thành viên hội đồng đánh giá đề tài',
};

export default function DeanCouncilsPage() {
    return <CouncilManagement />;
}
