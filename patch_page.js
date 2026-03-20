const fs = require('fs');
let code = fs.readFileSync('components/portal/project-registration-page.tsx', 'utf8');

if (!code.includes('SelectContent')) {
  code = code.replace(
    'import { Label } from "@/components/ui/label";',
    'import { Label } from "@/components/ui/label";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";'
  );
}

// 1. Add instructorId to the payload
code = code.replace(
  /expectedOutput: expectedOutput\.trim\(\) \? expectedOutput : null,/,
  'expectedOutput: expectedOutput.trim() ? expectedOutput : null,\n        instructorId: instructorId || undefined,'
);

// 2. Add Select UI right before the button
const selectUI = `              <div className="space-y-2">
                <Label className="text-muted-foreground">Người hướng dẫn</Label>
                <Select value={instructorId} onValueChange={setInstructorId}>
                  <SelectTrigger>
                     <SelectValue placeholder="Chọn người hướng dẫn (Tùy chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Không có --</SelectItem>
                    {users.filter(u => u.role !== "STUDENT" && u.id !== session?.id).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} - {u.role === "LECTURER" ? "Giảng viên" : "Cán bộ"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreate}`;

code = code.replace(
  /<Button onClick=\{handleCreate\}/,
  selectUI
);

// We need to fix the value="none" causing sending "none" as a string instead of undefined.
// Let's modify handleCreate payload slightly instead of doing it in UI but we can just map it.
// Actually, earlier I put `instructorId: instructorId || undefined,`
// Let's change the payload replacement to handle "none".
code = code.replace(
  'instructorId: instructorId || undefined,',
  'instructorId: instructorId && instructorId !== "none" ? instructorId : undefined,'
);

// 3. Update the history table to show instructor
code = code.replace(
  /<TableHead className="w-\[40%\] pl-6">Nội dung đề xuất<\/TableHead>\s*<TableHead>Trạng thái<\/TableHead>/g,
  '<TableHead className="w-[40%] pl-6">Nội dung đề xuất</TableHead><TableHead>Người HD</TableHead><TableHead>Trạng thái</TableHead>'
);

const historyTableCol = `<TableCell className="pl-6">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {item.objective}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                            </div>
                          </TableCell>`;

// Find the corresponding TableCell and add the instructor cell below it.
const instructorCell = `                          <TableCell>
                            {item.instructor ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-sm">{item.instructor.name}</span>
                                <Badge variant={item.instructorStatus === "ACCEPTED" ? "default" : "secondary"} className="text-[10px] scale-90 origin-left">
                                  {item.instructorStatus === "ACCEPTED" ? "Đã đồng ý" : item.instructorStatus === "REJECTED" ? "Từ chối" : "Chờ XN"}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>`;

code = code.replace(
  /<TableCell className="pl-6">[\s\S]*?(?=<\/TableCell>)<\/TableCell>/,
  (match) => match + '\n' + instructorCell
);

fs.writeFileSync('components/portal/project-registration-page.tsx', code);
