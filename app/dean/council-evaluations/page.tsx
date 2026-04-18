import { CouncilProjectAssignmentManagement } from '@/components/dean/council-project-assignment-management';

export default function DeanCouncilEvaluationsPage() {
    return <CouncilProjectAssignmentManagement mode="evaluations-only" deferEvaluationFetchUntilFilter />;
}
