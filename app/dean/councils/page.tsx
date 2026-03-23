import { CouncilManagement } from '@/components/dean/council-management';

export default function DeanCouncilsPage() {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Quản lý Hội đồng</h1>
                <p className="text-muted-foreground mt-1">
                    Tạo và phân công thành viên hội đồng đánh giá cho các đợt đăng ký đề tài
                </p>
            </div>
            <CouncilManagement />
        </div>
    );
}
