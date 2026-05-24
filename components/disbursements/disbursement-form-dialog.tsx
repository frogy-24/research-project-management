'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCreateDisbursement } from '@/hooks/useDisbursements';
import { useProjects } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
};

export function DisbursementFormDialog(_props: Props) {
  const { open, onOpenChange } = _props;
  const createMutation = useCreateDisbursement();
  const { data: projects = [] } = useProjects();

  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [disbursedAt, setDisbursedAt] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherFileUrl, setVoucherFileUrl] = useState('');
  const [reason, setReason] = useState('');

  const availableProjects = useMemo(
    () => projects.filter((p) => ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status)),
    [projects]
  );

  useEffect(() => {
    if (!open) {
      setProjectId('');
      setAmount('');
      setDisbursedAt('');
      setVoucherNo('');
      setVoucherFileUrl('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!projectId) return toast.error('Chọn đề tài');
    if (!amount || Number(amount) <= 0) return toast.error('Số tiền không hợp lệ');
    if (!disbursedAt) return toast.error('Chọn ngày giải ngân');

    await createMutation.mutateAsync({
      projectId,
      amount: Number(amount),
      disbursedAt: new Date(disbursedAt),
      voucherNo: voucherNo.trim() || undefined,
      voucherFileUrl: voucherFileUrl.trim() || undefined,
      reason: reason.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu giải ngân</DialogTitle>
          <DialogDescription>Nhập đầy đủ thông tin yêu cầu giải ngân cho đề tài.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Đề tài</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">-- Chọn đề tài --</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.code ?? 'N/A') + ' - ' + p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Số tiền (VNĐ)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} />
            </div>
            <div className="grid gap-2">
              <Label>Ngày giải ngân</Label>
              <Input value={disbursedAt} onChange={(e) => setDisbursedAt(e.target.value)} type="date" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Số chứng từ</Label>
              <Input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>URL chứng từ</Label>
              <Input value={voucherFileUrl} onChange={(e) => setVoucherFileUrl(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Lý do giải ngân</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo yêu cầu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
