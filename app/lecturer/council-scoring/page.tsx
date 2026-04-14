import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth-helpers';
import { CouncilScoringPage } from '@/components/lecturer/council-scoring-page';

export default async function LecturerCouncilScoringPage() {
    const user = await getAuthUser();

    if (!user) {
        redirect('/login');
    }

    // Check if user has LECTURER or COUNCIL role
    if (user.role !== 'LECTURER' && user.role !== 'COUNCIL') {
        redirect('/lecturer/profile');
    }

    return <CouncilScoringPage />;
}
