"use client"

import { useMemo, useState } from "react"
import { useCreateReportJob, useDeanReportStats, useDeleteReportJob, useReportJobs } from "@/hooks/useReports"
import { useCallRounds } from "@/hooks/useCallRounds"
import type { ReportJob } from "@/api/reports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { BarChart3, Download, FileText, GraduationCap, Plus, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react"

const REPORT_TYPES = [
  { value: "PROJECT_SUMMARY", label: "Tổng hợp đề tài" },
  { value: "COUNCIL_REVIEW", label: "Hội đồng chấm điểm" },
  { value: "DISBURSEMENT", label: "Giải ngân" },
  { value: "STUDENT_PROGRESS", label: "Tiến độ sinh viên" },
  { value: "CUSTOM", label: "Tùy chỉnh" },
]

const statusLabels: Record<string, string> = {
  QUEUED: "Đang chờ",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Thất bại",
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  QUEUED: "secondary",
  PROCESSING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
}

export function ReportManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCallRoundId, setSelectedCallRoundId] = useState("")
  const [selectedReportType, setSelectedReportType] = useState(REPORT_TYPES[0].value)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data: callRounds = [] } = useCallRounds()
  const { data, isLoading, refetch } = useReportJobs()
  const { data: statsData, isLoading: statsLoading } = useDeanReportStats(selectedYear)
  const createMutation = useCreateReportJob()
  const deleteMutation = useDeleteReportJob()

  const jobs = data?.data || []
  const stats = statsData?.data
  const pendingJobs = jobs.filter((j: ReportJob) => j.status === "QUEUED" || j.status === "PROCESSING")
  const completedJobs = jobs.filter((j: ReportJob) => j.status === "COMPLETED" || j.status === "FAILED")

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return [now, now - 1, now - 2, now - 3]
  }, [])

  const handleOpenCreateDialog = () => {
    if (!selectedCallRoundId && callRounds[0]?.id) setSelectedCallRoundId(callRounds[0].id)
    setIsCreateOpen(true)
  }

  const handleCreateReport = async () => {
    if (!selectedCallRoundId) return
    await createMutation.mutateAsync({
      reportType: selectedReportType,
      callRoundId: selectedCallRoundId,
      parameters: { year: selectedYear },
    } as any)
    setIsCreateOpen(false)
    refetch()
  }

  const handleDelete = async (job: ReportJob) => {
    const ok = window.confirm("Xóa báo cáo này? Hành động sẽ xóa cả file đã sinh.")
    if (!ok) return
    await deleteMutation.mutateAsync(job.id)
    refetch()
  }

  return (
    <div className="space-y-6 p-1">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl md:text-3xl">Báo cáo điều hành khoa</CardTitle>
              <CardDescription className="text-slate-200 mt-1">Theo dõi chỉ số năm học • Xuất báo cáo theo nhu cầu</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreateDialog}>
                <Plus className="w-4 h-4 mr-2" /> Xuất báo cáo
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: `Tổng đề tài ${selectedYear}`, value: stats?.totalProjects ?? 0, icon: BarChart3 },
          { label: "Đề tài được duyệt", value: stats?.approvedRegistrations ?? 0, icon: ShieldCheck },
          { label: "Lượt chấm hội đồng", value: stats?.evaluations ?? 0, icon: FileText },
          { label: "Hội đồng", value: stats?.councils ?? 0, icon: Users },
          { label: "Giảng viên", value: stats?.lecturers ?? 0, icon: GraduationCap },
          { label: "Sinh viên", value: stats?.students ?? 0, icon: Users },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{statsLoading ? "..." : kpi.value}</p>
                </div>
                <kpi.icon className="w-5 h-5 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-lg">Lịch sử xuất báo cáo</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin" /></div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">Đang chạy ({pendingJobs.length})</TabsTrigger>
                <TabsTrigger value="completed">Hoàn tất ({completedJobs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4 space-y-3">
                {pendingJobs.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">Không có tác vụ đang chạy</div> : pendingJobs.map((j) => (
                  <Card key={j.id}><CardContent className="pt-5 space-y-3"><div className="flex justify-between"><div className="font-medium">{REPORT_TYPES.find((t) => t.value === j.reportType)?.label || j.reportType}</div><Badge variant={statusVariant[j.status]}>{statusLabels[j.status]}</Badge></div><Progress value={j.progress} /></CardContent></Card>
                ))}
              </TabsContent>
              <TabsContent value="completed" className="mt-4 space-y-3">
                {completedJobs.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">Chưa có báo cáo đã xuất</div> : completedJobs.map((j) => (
                  <Card key={j.id}><CardContent className="pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{REPORT_TYPES.find((t) => t.value === j.reportType)?.label || j.reportType}</div><div className="text-xs text-muted-foreground mt-1">{new Date(j.createdAt).toLocaleString("vi-VN")}</div></div><div className="flex items-center gap-2"><Badge variant={statusVariant[j.status]}>{statusLabels[j.status]}</Badge>{j.status === "COMPLETED" && j.resultUrl && <Button size="sm" onClick={() => window.open(j.resultUrl, "_blank")}><Download className="w-4 h-4 mr-1" />Tải</Button>}<Button size="sm" variant="destructive" onClick={() => handleDelete(j)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4 mr-1" />Xóa</Button></div></div></CardContent></Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất báo cáo thống kê</DialogTitle>
            <DialogDescription>Chọn tham số trước khi tạo lệnh xuất file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Năm</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Đợt đăng ký</Label>
              <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}><SelectTrigger><SelectValue placeholder="Chọn đợt" /></SelectTrigger><SelectContent>{callRounds.map((cr: { id: string; name: string }) => <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Loại báo cáo</Label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPORT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button className="w-full" onClick={handleCreateReport} disabled={!selectedCallRoundId || createMutation.isPending}>{createMutation.isPending ? "Đang tạo..." : "Tạo lệnh xuất"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}