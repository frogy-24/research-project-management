// components/disbursements/disbursement-status-badge.tsx
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { DisbursementStatus } from '@/types/disbursement.schema';

interface DisbursementStatusBadgeProps {
  status: DisbursementStatus;
  className?: string;
}

export function DisbursementStatusBadge({ status, className }: DisbursementStatusBadgeProps) {
  const config = {
    PENDING: {
      label: 'Chờ duyệt',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    APPROVED: {
      label: 'Đã duyệt',
      variant: 'default' as const,
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    REJECTED: {
      label: 'Từ chối',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-rose-100 text-rose-800 border-rose-300',
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge variant="outline" className={`gap-1 ${statusClassName} ${className || ''}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
