import { StudentCouncilsClient } from '@/components/student/student-councils-client';

export default function StudentCouncilsPage() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Xem hội đồng</h1>
                <p className="text-muted-foreground">
                    Theo dõi hội đồng đánh giá được phân cho các đề tài mà bạn đang tham gia.
                </p>
            </div>

            <StudentCouncilsClient />
        </div>
    );
}
