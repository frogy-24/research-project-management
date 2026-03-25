import { LecturerCouncilsClient } from '@/components/lecturer/lecturer-councils-client';

export default function LecturerCouncilsPage() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Hội đồng của tôi</h1>
                <p className="text-muted-foreground">
                    Kiểm tra danh sách hội đồng mà bạn đang tham gia theo từng đợt đề tài.
                </p>
            </div>

            <LecturerCouncilsClient />
        </div>
    );
}
