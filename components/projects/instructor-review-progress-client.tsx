// components/projects/instructor-review-progress-client.tsx
"use client";

import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useAuthSession } from "@/hooks/useAuth";
import { ProgressReportPanel } from "@/components/projects/progress-report-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, User, Mail, Phone } from "lucide-react";

export function InstructorReviewProgressClient() {
  const { data: session } = useAuthSession();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const users = usersData?.data ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = projectsLoading || usersLoading;

  // Filter projects where current user is instructor
  const instructorProjects = useMemo(() => {
    return projects.filter(p => p.instructorId === session?.userId);
  }, [projects, session?.userId]);

  // Combine projects with leader info
  const projectsWithLeader = useMemo(() => {
    return instructorProjects.map(project => {
      const leader = users.find(u => u.id === project.leaderId);
      return {
        ...project,
        leaderInfo: leader,
      };
    });
  }, [instructorProjects, users]);

  // Filter by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projectsWithLeader;
    
    const query = searchQuery.toLowerCase();
    return projectsWithLeader.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.leaderInfo?.name.toLowerCase().includes(query) ||
      p.leaderInfo?.code?.toLowerCase().includes(query) ||
      p.leaderInfo?.email.toLowerCase().includes(query)
    );
  }, [projectsWithLeader, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // If a project is selected, show the report panel
  if (selectedProjectId) {
    const selectedProject = projectsWithLeader.find(p => p.id === selectedProjectId);
    
    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setSelectedProjectId(null)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>

        {/* Project info header */}
        {selectedProject && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedProject.leaderInfo?.name || "N/A"}
                </span>
                {selectedProject.leaderInfo?.code && (
                  <span>MSSV: {selectedProject.leaderInfo.code}</span>
                )}
                {selectedProject.leaderInfo?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {selectedProject.leaderInfo.email}
                  </span>
                )}
                <Badge variant="secondary">
                  {selectedProject.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Progress Report Panel */}
        <ProgressReportPanel projectId={selectedProjectId} />
      </div>
    );
  }

  // Show table of projects
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Danh sách đề tài hướng dẫn</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Có {instructorProjects.length} đề tài bạn đang hướng dẫn
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm đề tài, sinh viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {instructorProjects.length === 0 
                  ? "Bạn chưa được phân công hướng dẫn đề tài nào."
                  : "Không tìm thấy kết quả phù hợp."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Tên đề tài</TableHead>
                    <TableHead>Trưởng nhóm</TableHead>
                    <TableHead>MSSV</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project, index) => (
                    <TableRow 
                      key={project.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium max-w-xs">
                        <div className="line-clamp-2">{project.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          {project.leaderInfo?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>{project.leaderInfo?.code || "-"}</TableCell>
                      <TableCell>
                        {project.leaderInfo?.email ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{project.leaderInfo.email}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {project.leaderInfo?.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            {project.leaderInfo.phone}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectId(project.id);
                          }}
                        >
                          Xem báo cáo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
