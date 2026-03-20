"use client";

import { useMemo, useState } from "react";
import { format, addWeeks } from "date-fns";
import { vi } from "date-fns/locale";
import { Pickaxe, Send, FileCheck2, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateProgressReport, useProgressReports } from "@/hooks/useProjectOperations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/projects/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";

interface ProgressReportManagerProps {
  project: {
    id: string;
    title: string;
    leader: { name: string } | null;
    proposalFileUrl: string | null;
    createdAt: string;
  };
}

export function ProgressReportManager({ project }: ProgressReportManagerProps) {
  const progressReportsQuery = useProgressReports(project.id);
  const createProgressReport = useCreateProgressReport();

  const reports = progressReportsQuery.data ?? [];
  
  // Auto-generate week logic
  const currentWeek = reports.length + 1;
  const projectStartDate = new Date(project.createdAt);
  const fromDate = addWeeks(projectStartDate, currentWeek - 1);
  const toDate = addWeeks(projectStartDate, currentWeek);

  const [form, setForm] = useState({
    tasks: "Triển khai các hạng mục tuần " + currentWeek,
    performedContent: "",
    results: "",
    reportContent: "",
    fileUrl: "",
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const { data } = await axios.post("/api/upload", formData);
      if (data.url) {
        setForm(prev => ({ ...prev, fileUrl: data.url }));
        toast.success("Tải tệp lên thành công!");
      }
    } catch (err) {
      toast.error("Lỗi khi tải tệp lên");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateReport = () => {
    createProgressReport.mutate(
      {
        projectId: project.id,
        payload: {
          periodLabel: `Tuần ${currentWeek}`,
          summary: `Báo cáo tuần ${currentWeek}`,
          week: currentWeek,
          fromDate: fromDate,
          toDate: toDate,
          tasks: form.tasks,
          performedContent: form.performedContent,
          results: form.results,
          reportContent: form.reportContent,
          fileUrl: form.fileUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Nộp báo cáo thành công");
          setForm({
            tasks: "Triển khai các hạng mục tiếp theo",
            performedContent: "",
            results: "",
            reportContent: "",
            fileUrl: "",
          });
        },
        onError: () => toast.error("Không thể nộp báo cáo"),
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Phần 1: Thông tin đề tài */}
      <Card className="border-border/50 shadow-sm border-l-4 border-l-primary">
        <CardHeader className="pb-3 bg-muted/20">
          <CardTitle className="text-lg">Thông tin Đề tài Nghiên cứu</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Tên đề tài:</p>
            <p className="font-semibold line-clamp-2">{project.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Chủ nhiệm / Hướng dẫn:</p>
            <p className="font-medium">{project.leader?.name || "Chưa xác định"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bản tóm tắt/thuyết minh cuối:</p>
            {project.proposalFileUrl ? (
              <a href={project.proposalFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1 mt-1">
                <Paperclip className="h-4 w-4" /> Xem tệp đính kèm
              </a>
            ) : (
              <p className="text-sm italic">Chưa có tệp</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phần 2: Báo cáo Tiến độ Form */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pickaxe className="h-5 w-5 text-primary" /> 
            Soạn Báo Cáo Tiến Độ Mới
          </CardTitle>
          <CardDescription>Tiến trình tự động tính toán dựa trên ngày bắt đầu đề tài.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-md border">
             <div>
                <Label className="text-muted-foreground text-xs uppercase">Giai đoạn</Label>
                <div className="font-medium text-lg text-primary mt-1">Tuần {currentWeek}</div>
             </div>
             <div>
                <Label className="text-muted-foreground text-xs uppercase">Từ ngày (Tự sinh)</Label>
                <div className="font-medium mt-1">{format(fromDate, "dd/MM/yyyy", { locale: vi })}</div>
             </div>
             <div>
                <Label className="text-muted-foreground text-xs uppercase">Đến ngày (Tự sinh)</Label>
                <div className="font-medium mt-1">{format(toDate, "dd/MM/yyyy", { locale: vi })}</div>
             </div>
          </div>

          <div className="space-y-2">
            <Label>Công việc dự kiến (Tự định nghĩa hoặc theo quy trình)</Label>
            <Input 
              value={form.tasks} 
              onChange={e => setForm(p => ({ ...p, tasks: e.target.value }))} 
              className="bg-background"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nội dung thực hiện</Label>
              <Textarea 
                value={form.performedContent} 
                onChange={e => setForm(p => ({ ...p, performedContent: e.target.value }))} 
                placeholder="Mô tả công việc đã làm..."
                className="bg-background min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Kết quả đạt được</Label>
              <Textarea 
                value={form.results} 
                onChange={e => setForm(p => ({ ...p, results: e.target.value }))} 
                placeholder="Kết quả của tuần này..."
                className="bg-background min-h-24"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nội dung Báo cáo chi tiết (Trình soạn thảo)</Label>
            <RichTextEditor 
              value={form.reportContent} 
              onChange={val => setForm(p => ({ ...p, reportContent: val }))}

            />
          </div>

          <div className="space-y-2">
             <Label>Tệp đính kèm tài liệu minh chứng (nếu có)</Label>
             <div className="flex items-center gap-4">
                <Input type="file" onChange={handleFileUpload} className="max-w-sm" disabled={isUploading} />
                {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {form.fileUrl && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Đã tải lên
                  </Badge>
                )}
             </div>
          </div>

          <div className="pt-2">
             <Button onClick={handleCreateReport} disabled={createProgressReport.isPending} className="w-full md:w-auto">
               <Send className="mr-2 h-4 w-4" />
               {createProgressReport.isPending ? "Đang gửi..." : "Gửi Báo Cáo"}
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phần 3: Danh sách Lịch sử Báo Cáo */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Lịch sử Báo Cáo Tuần
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {progressReportsQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Đang tải lịch sử...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Chưa có báo cáo nào được nộp.</div>
          ) : (
            <ScrollArea className="h-96 w-full">
              <div className="flex flex-col">
                {reports.map((report) => (
                  <div key={report.id} className="border-b last:border-0 p-6 hover:bg-muted/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-semibold text-primary">Tuần {report.week ?? 0} &mdash; {report.periodLabel}</h4>
                       <span className="text-xs text-muted-foreground">Nộp lúc: {format(new Date(report.submittedAt), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                       Từ {report.fromDate ? format(new Date(report.fromDate), "dd/MM/yyyy") : "?"} đến {report.toDate ? format(new Date(report.toDate), "dd/MM/yyyy") : "?"}
                    </div>
                    
                    <div className="space-y-4 text-sm mt-4 bg-background border p-4 rounded bg-muted/10">
                      <div>
                        <span className="font-semibold block mb-1">Công việc:</span>
                        {report.tasks || "-"}
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                         <div>
                            <span className="font-semibold block mb-1">Đã thực hiện:</span>
                            {report.performedContent || "-"}
                         </div>
                         <div>
                            <span className="font-semibold block mb-1">Kết quả:</span>
                            {report.results || "-"}
                         </div>
                      </div>
                      {report.reportContent && (
                        <div>
                          <span className="font-semibold block mb-2">Chi tiết báo cáo:</span>
                          <div dangerouslySetInnerHTML={{ __html: report.reportContent }} className="prose prose-sm max-w-none text-muted-foreground bg-white border p-3 rounded p-2" />
                        </div>
                      )}
                      {report.fileUrl && (
                        <div className="pt-2">
                           <a href={report.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                             <Paperclip className="h-4 w-4" /> Tải về tệp báo cáo
                           </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
