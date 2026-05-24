
"use client"

import { useState } from "react"
import { useDeleteReportJob, useReportJobs } from "@/hooks/useReports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FileText, Download, RefreshCw, Plus, Trash2 } from "lucide-react"
import { ReportTemplateDialog } from "@/components/projects/report-template-dialog"
import { useCallRounds } from "@/hooks/useCallRounds"
import type { ReportJob } from "@/api/reports"

const REPORT_TYPES = [
  { value: "PROJECT_SUMMARY", label: "Tổng hợp đề tài" },
  { value: "COUNCIL_REVIEW", label: "Hội đồng chấm điểm" },
  { value: "DISBURSEMENT", label: "Giải ngân" },
  { value: "STUDENT_PROGRESS", label: "Tiến độ sinh viên" },
  { value: "CUSTOM", label: "Tùy chỉnh" },
]

const statusColors: Record<string, string> = {
  QUEUED: "bg-yellow-500",
  PROCESSING: "bg-blue-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
}

const statusLabels: Record<string, string> = {
  QUEUED: "Đang chờ",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
}

export function ReportManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>("")
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const { data: callRounds = [] } = useCallRounds()
  const { data, isLoading, refetch } = useReportJobs()
  const deleteMutation = useDeleteReportJob()
  const jobs = data?.data || []

  const pendingJobs = jobs.filter((j: ReportJob) => j.status === "QUEUED" || j.status === "PROCESSING")
  const completedJobs = jobs.filter((j: ReportJob) => j.status === "COMPLETED" || j.status === "FAILED")

  const selectedCallRound = callRounds.find((cr: { id: string; name: string }) => cr.id === selectedCallRoundId)

  const handleOpenCreateDialog = () => {
    if (callRounds.length > 0 && !selectedCallRoundId) {
      setSelectedCallRoundId(callRounds[0].id)
    }
    setIsCreateOpen(true)
  }

  const handleProceedToTemplate = () => {
    if (selectedCallRoundId) {
      setIsCreateOpen(false)
      setShowTemplateDialog(true)
    }
  }

  const handleDownload = async (job: ReportJob) => {
    if (!job.resultUrl) return
    window.open(job.resultUrl, "_blank")
  }

  const handleDelete = async (job: ReportJob) => {
    const ok = window.confirm("Xóa báo cáo này? Hành động sẽ xóa cả file đã sinh.")
    if (!ok) return
    await deleteMutation.mutateAsync(job.id)
    refetch()
  }

  const JobCard = ({ job }: { job: ReportJob }) => (
    <Card key={job.id}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <CardTitle className="text-lg">
              {REPORT_TYPES.find((t) => t.value === job.reportType)?.label || job.reportType}
            </CardTitle>
          </div>
          <Badge className={statusColors[job.status]}>
            {statusLabels[job.status]}
          </Badge>
        </div>
        <CardDescription>
          {new Date(job.createdAt).toLocaleString("vi-VN")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(job.status === "QUEUED" || job.status === "PROCESSING") && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Đang xử lý...</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} />
          </div>
        )}
        
        {job.status === "COMPLETED" && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-green-600">Báo cáo đã sẵn sàng</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleDownload(job)}>
                <Download className="w-4 h-4 mr-2" />
                Tải xuống
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(job)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            </div>
          </div>
        )}
        
        {job.status === "FAILED" && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-red-600">{job.error || "Đã xảy ra lỗi"}</p>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(job)} disabled={deleteMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Báo cáo</h1>
          <p className="text-muted-foreground">Tạo và theo dõi báo cáo tự động</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>

          <Button onClick={handleOpenCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo báo cáo
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo báo cáo mới</DialogTitle>
                <DialogDescription>
                  Chọn đợt đăng ký để tạo báo cáo
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Đợt đăng ký</Label>
                  <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đợt đăng ký" />
                    </SelectTrigger>
                    <SelectContent>
                      {callRounds.map((cr: { id: string; name: string }) => (
                        <SelectItem key={cr.id} value={cr.id}>
                          {cr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleProceedToTemplate}
                  disabled={!selectedCallRoundId}
                >
                  Tiếp tục
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ReportTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        callRoundId={selectedCallRoundId}
        callRoundName={selectedCallRound?.name}
        onReportCreated={() => refetch()}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Chờ in ({pendingJobs.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Đã in ({completedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingJobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-2" />
                  <p>Không có báo cáo đang chờ</p>
                </CardContent>
              </Card>
            ) : (
              pendingJobs.map((job: ReportJob) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedJobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-2" />
                  <p>Chưa có báo cáo nào đã in</p>
                </CardContent>
              </Card>
            ) : (
              completedJobs.map((job: ReportJob) => <JobCard key={job.id} job={job} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
