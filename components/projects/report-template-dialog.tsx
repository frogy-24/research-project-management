'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface ReportTemplate {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface ReportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callRoundId: string;
  callRoundName?: string;
  onReportCreated?: () => void;
}

export function ReportTemplateDialog({
  open,
  onOpenChange,
  callRoundId,
  callRoundName,
  onReportCreated,
}: ReportTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('select');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<ReportTemplate[]>({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const res = await fetch('/api/dean/report-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      return json.data || [];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/dean/report-templates', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Upload mẫu báo cáo thành công');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setActiveTab('select');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload thất bại');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dean/report-templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Xóa mẫu báo cáo thành công');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
    onError: () => {
      toast.error('Xóa thất bại');
    },
  });

  // Create report job mutation
  const createReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('Chưa chọn mẫu báo cáo');

      const res = await fetch('/api/dean/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callRoundId,
          templateId: selectedTemplate.id,
          templateUrl: selectedTemplate.fileUrl,
          templateType: selectedTemplate.fileType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Tạo báo cáo thất bại');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Đã gửi yêu cầu tạo báo cáo');
      onOpenChange(false);
      onReportCreated?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Tạo báo cáo thất bại');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tạo báo cáo - {callRoundName || 'Đợt đăng ký'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Chọn mẫu báo cáo</TabsTrigger>
            <TabsTrigger value="manage">Quản lý mẫu báo cáo</TabsTrigger>
          </TabsList>

          {/* Tab 1: Select Template */}
          <TabsContent value="select" className="flex-1 overflow-hidden flex flex-col">
            {templatesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileTypeIcon(template.fileType)}
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(template.fileSize / 1024).toFixed(1)} KB • {template.fileType.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Badge variant="default">Đã chọn</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Chưa có mẫu báo cáo nào</p>
                  <Button variant="link" onClick={() => setActiveTab('manage')}>
                    Upload mẫu báo cáo
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button
                onClick={() => createReportMutation.mutate()}
                disabled={!selectedTemplate || createReportMutation.isPending}
              >
                {createReportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Tạo báo cáo'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Manage Templates */}
          <TabsContent value="manage" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload mẫu báo cáo mới
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Hỗ trợ: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
                </p>
              </div>

              {uploadMutation.isPending && (
                <div className="mb-4">
                  <Progress value={100} className="h-2 animate-pulse" />
                </div>
              )}

              {templatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : templates && templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên mẫu</TableHead>
                      <TableHead>Loại file</TableHead>
                      <TableHead>Kích thước</TableHead>
                      <TableHead className="w-16">Xóa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(template.fileType)}
                            <span className="truncate max-w-[200px]">{template.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{template.fileType.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{(template.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(template.id)}
                            disabled={deleteMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có mẫu báo cáo nào
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
