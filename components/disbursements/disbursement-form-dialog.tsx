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
import { uploadApi } from '@/api/upload';
import { FileImage, Upload } from 'lucide-react';

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
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);
  const [voucherInputMode, setVoucherInputMode] = useState<'upload' | 'url'>('upload');
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
      setVoucherFile(null);
      setIsUploadingVoucher(false);
      setVoucherInputMode('upload');
      setReason('');
    }
  }, [open]);

  const handleVoucherFileChange = async (file?: File) => {
    if (!file) return;

    const isPdfByType = file.type === 'application/pdf';
    const isPdfByName = /\.pdf$/i.test(file.name);
    if (!isPdfByType && !isPdfByName) {
      toast.error('Chỉ chấp nhận file PDF');
      return;
    }

    try {
      setIsUploadingVoucher(true);
      setVoucherFile(file);
      const uploaded = await uploadApi.file(file);
      setVoucherFileUrl(uploaded.url);
      toast.success('Upload chứng từ thành công');
    } catch {
      toast.error('Upload chứng từ thất bại');
      setVoucherFile(null);
      setVoucherFileUrl('');
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectId) return toast.error('Chọn đề tài');
    if (!amount || Number(amount) <= 0) return toast.error('Số tiền không hợp lệ');
    if (!disbursedAt) return toast.error('Chọn ngày giải ngân');
    if (voucherFileUrl && !/\.pdf(?:$|[?#])/i.test(voucherFileUrl.trim())) {
      return toast.error('URL chứng từ phải là file PDF');
    }

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

          <div className="grid gap-2">
            <div className="grid gap-2">
              <Label>Số chứng từ</Label>
              <Input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>

            <div className="grid gap-3 rounded-md border p-3">
              <Label>Chứng từ (PDF)</Label>

              <div className="inline-flex rounded-md border p-1 w-fit">
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 text-sm ${voucherInputMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setVoucherInputMode('upload')}
                >
                  Upload
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 text-sm ${voucherInputMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setVoucherInputMode('url')}
                >
                  Nhập link
                </button>
              </div>

              {voucherInputMode === 'upload' ? (
                <div className="grid gap-2">
                  <input
                    id="voucher-pdf-upload"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => void handleVoucherFileChange(e.target.files?.[0])}
                    disabled={isUploadingVoucher || createMutation.isPending}
                    className="hidden"
                  />
                  <label
                    htmlFor="voucher-pdf-upload"
                    className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground hover:bg-muted"
                  >
                    <FileImage className="mb-2 h-6 w-6" />
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <Upload className="h-3.5 w-3.5" /> Upload
                    </span>
                  </label>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>URL chứng từ</Label>
                  <Input
                    value={voucherFileUrl}
                    onChange={(e) => setVoucherFileUrl(e.target.value)}
                    placeholder="https://.../chung-tu.pdf"
                  />
                </div>
              )}

              {voucherFile ? <p className="text-xs text-muted-foreground">Đã chọn: {voucherFile.name}</p> : null}
              {isUploadingVoucher ? <p className="text-xs text-muted-foreground">Đang upload...</p> : null}
              {voucherFileUrl ? <p className="text-xs text-muted-foreground break-all">URL: {voucherFileUrl}</p> : null}
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
