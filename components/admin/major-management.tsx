"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { useMajors, useCreateMajor, useUpdateMajor, useDeleteMajor } from "@/hooks/useMajors";
import { useDepartments } from "@/hooks/useDepartments";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MajorManagement() {
  const { data: majorsData, isLoading: isLoadingMajors } = useMajors({ limit: 1000 });
  const majors = majorsData?.data ?? [];
  
  const { data: departments = [], isLoading: isLoadingDepts } = useDepartments();
  
  const createMutation = useCreateMajor();
  const updateMutation = useUpdateMajor();
  const deleteMutation = useDeleteMajor();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    departmentId: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleOpenDialog = (major?: any) => {
    if (major) {
      setEditingId(major.id);
      setFormData({
        code: major.code,
        name: major.name,
        description: major.description || "",
        departmentId: major.departmentId,
      });
    } else {
      setEditingId(null);
      setFormData({ code: "", name: "", description: "", departmentId: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.departmentId) {
      toast.error("Vui lòng chọn khoa");
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast.success("Cập nhật ngành thành công");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Thêm ngành thành công");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa ngành này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Xóa ngành thành công");
      } catch (error: any) {
        toast.error(error.message || "Không thể xóa ngành");
      }
    }
  };

  const filteredMajors = useMemo(() => {
    return majors.filter((m: any) => {
      const matchesSearch =
        m.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        m.department?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesDepartment =
        selectedDepartment === "all" || m.departmentId === selectedDepartment;
      
      return matchesSearch && matchesDepartment;
    });
  }, [majors, debouncedSearchTerm, selectedDepartment]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Danh sách Ngành</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm Ngành
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Chỉnh sửa Ngành" : "Thêm Ngành mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department">Khoa</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khoa" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã Ngành</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="VD: CNTT01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên Ngành</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Kỹ thuật phần mềm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả về ngành..."
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
              placeholder="Tìm kiếm theo tên, mã ngành hoặc khoa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-[240px]">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Lọc theo khoa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả khoa</SelectItem>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
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
                <TableHead>Mã Ngành</TableHead>
                <TableHead>Tên Ngành</TableHead>
                <TableHead>Khoa</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMajors ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : filteredMajors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy ngành nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMajors.map((major: any) => (
                  <TableRow key={major.id}>
                    <TableCell className="font-medium">{major.code}</TableCell>
                    <TableCell>{major.name}</TableCell>
                    <TableCell>{major.department?.name || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(major)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(major.id)}
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
      </CardContent>
    </Card>
  );
}
