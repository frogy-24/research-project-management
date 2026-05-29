"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from "@/hooks/useClasses";
import { useMajors } from "@/hooks/useMajors";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";

export function ClassManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    majorId: "",
  });
  
  const { data: classesData, isLoading: isLoadingClasses } = useClasses({
    search: debouncedSearchTerm || undefined,
    majorId: selectedMajor === "all" ? undefined : selectedMajor,
    page: currentPage,
    limit: pageSize,
  });
  const classes = classesData?.data ?? [];
  const pagination = classesData?.pagination;
  
  const { data: majorsData } = useMajors();
  const majors = majorsData?.data ?? [];
  
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();
  const deleteMutation = useDeleteClass();

  const handleOpenDialog = (classObj?: any) => {
    if (classObj) {
      setEditingId(classObj.id);
      setFormData({
        code: classObj.code,
        name: classObj.name,
        majorId: classObj.majorId,
      });
    } else {
      setEditingId(null);
      setFormData({ code: "", name: "", majorId: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.majorId) {
      toast.error("Vui lòng chọn ngành");
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("Cập nhật lớp thành công");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Thêm lớp thành công");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lớp này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Xóa lớp thành công");
      } catch (error: any) {
        toast.error(error.message || "Không thể xóa lớp");
      }
    }
  };

  const getPageNumbers = useMemo(() => {
    if (!pagination) return [] as (number | string)[];
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [pagination]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Danh sách Lớp</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm Lớp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Chỉnh sửa Lớp" : "Thêm Lớp mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="major">Ngành</Label>
                <Select
                  value={formData.majorId}
                  onValueChange={(value) => setFormData({ ...formData, majorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngành" />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map((major: any) => (
                      <SelectItem key={major.id} value={major.id}>
                        {major.name} ({major.department?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã Lớp</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="VD: 20DTH01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên Lớp</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Đại học Tin học 01"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Cập nhật" : "Lưu"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, mã lớp hoặc ngành..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="w-[260px]">
            <Select
              value={selectedMajor}
              onValueChange={(value) => {
                setSelectedMajor(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lọc theo ngành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành</SelectItem>
                {majors.map((major: any) => (
                  <SelectItem key={major.id} value={major.id}>
                    {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Lớp</TableHead>
                <TableHead>Tên Lớp</TableHead>
                <TableHead>Ngành</TableHead>
                <TableHead>Khoa</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingClasses ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : classes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy lớp nào.
                  </TableCell>
                </TableRow>
              ) : (
                classes.map((classObj: any) => (
                  <TableRow key={classObj.id}>
                    <TableCell className="font-medium">{classObj.code}</TableCell>
                    <TableCell>{classObj.name}</TableCell>
                    <TableCell>{classObj.major?.name || "N/A"}</TableCell>
                    <TableCell>{classObj.major?.department?.name || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(classObj)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(classObj.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                </PaginationItem>

                {getPageNumbers.map((pageNum, idx) => (
                  <PaginationItem key={idx}>
                    {pageNum === "..." ? (
                      <span className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => setCurrentPage(pageNum as number)}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Sau
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
