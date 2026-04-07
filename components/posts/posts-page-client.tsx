'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Editor } from '@tiptap/react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import {
  useCreatePost,
  useDeletePost,
  useModeratePost,
  useMyPosts,
  usePendingPostsForDean,
  usePublishedPosts,
  useUpdatePost,
} from '@/hooks/usePosts';
import {
  createPostSchema,
  type CreatePostInput,
  type PostAudience,
  type PostItem,
} from '@/types/post.schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PostRichEditor } from '@/components/posts/post-rich-editor';
import { PostContentRenderer } from '@/components/posts/post-content-renderer';

const audienceLabelMap: Record<PostAudience, string> = {
  LECTURERS: 'Dành cho giảng viên',
  STUDENTS: 'Dành cho học sinh',
  DEPARTMENT: 'Dành cho khoa',
  ALL: 'Toàn trường',
};

const statusLabelMap: Record<PostItem['status'], string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const statusVariantMap: Record<PostItem['status'], 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

function formatDateTime(value: string | Date | null): string {
  if (!value) return '---';
  return new Date(value).toLocaleString('vi-VN');
}

function extractFirstImageSrc(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function extractPlainText(content: string): string {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeContent(content: string, maxLength = 180): string {
  const plain = extractPlainText(content);
  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}...`;
}

type PostFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialPost: PostItem | null;
  isPending: boolean;
  meDepartmentName?: string;
  onSubmit: (values: CreatePostInput) => void;
};

function PostFormDialog({
  open,
  onOpenChange,
  mode,
  initialPost,
  isPending,
  meDepartmentName,
  onSubmit,
}: PostFormDialogProps) {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '<p></p>',
      audience: 'ALL',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    // Keep current draft when reopening create dialog after accidental close.
    if (mode === 'create') {
      const currentValues = form.getValues();
      const hasDraft =
        currentValues.title.trim().length > 0 ||
        (currentValues.content && currentValues.content !== '<p></p>');

      if (hasDraft) {
        return;
      }
    }

    form.reset({
      title: initialPost?.title ?? '',
      content: initialPost?.content ?? '<p></p>',
      audience: initialPost?.audience ?? 'ALL',
    });
  }, [form, initialPost, open]);

  const selectedAudience = useWatch({
    control: form.control,
    name: 'audience',
  });

  const submitLabel = mode === 'create' ? 'Đăng bài' : 'Cập nhật bài viết';

  const handlePreview = () => {
    const editorHtml = editorRef.current?.getHTML();
    setPreviewContent(editorHtml ?? form.getValues('content') ?? '');
    setIsPreviewOpen(true);
  };

  const syncEditorContentBeforeSubmit = () => {
    const editorHtml = editorRef.current?.getHTML();
    if (editorHtml) {
      form.setValue('content', editorHtml, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPreviewContent('');
      setIsPreviewOpen(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Thêm bài viết mới' : 'Sửa bài viết'}</DialogTitle>
          <DialogDescription>
            Bạn có thể chèn ảnh/tài liệu ở vị trí bất kỳ và xem trước ngay bên dưới trước khi lưu.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmitCapture={syncEditorContentBeforeSubmit}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tiêu đề bài viết" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung</FormLabel>
                  <FormControl>
                    <PostRichEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={isPending}
                      onEditorReady={(editor) => {
                        editorRef.current = editor;
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đối tượng xem</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn đối tượng xem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LECTURERS">{audienceLabelMap.LECTURERS}</SelectItem>
                      <SelectItem value="STUDENTS">{audienceLabelMap.STUDENTS}</SelectItem>
                      <SelectItem value="DEPARTMENT">{audienceLabelMap.DEPARTMENT}</SelectItem>
                      <SelectItem value="ALL">{audienceLabelMap.ALL}</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedAudience === 'DEPARTMENT' && (
                    <p className="text-xs text-muted-foreground">
                      Bài viết sẽ hiển thị cho người dùng thuộc khoa: {meDepartmentName ?? 'Chưa xác định'}.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handlePreview}>
                Xem trước
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </form>
        </Form>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Xem trước nội dung bài viết</DialogTitle>
              <DialogDescription>
                Nội dung hiển thị theo đúng định dạng trước khi bạn lưu bài viết.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-auto rounded-md border p-3">
              {previewContent ? (
                <PostContentRenderer content={previewContent} />
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có nội dung để xem trước.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export function PostsPageClient() {
  const { data: session } = useAuthSession();
  const { data: me } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<'mine' | 'pending' | 'published'>('mine');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostItem | null>(null);
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const canCreate = session?.role === 'DEAN' || session?.role === 'LECTURER';
  const canModerate = session?.role === 'DEAN' || session?.role === 'ADMIN';
  const isDean = session?.role === 'DEAN';

  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();
  const moderateMutation = useModeratePost();

  const { data: publishedPosts = [], isLoading: isPublishedLoading } = usePublishedPosts();
  const { data: myPosts = [], isLoading: isMyPostsLoading } = useMyPosts({ enabled: canCreate });
  const { data: pendingPosts = [], isLoading: isPendingLoading } = usePendingPostsForDean({
    enabled: canModerate,
  });

  const onCreate = (values: CreatePostInput) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const onUpdate = (values: CreatePostInput) => {
    if (!editingPost) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingPost.id,
        payload: values,
      },
      {
        onSuccess: () => {
          setEditingPost(null);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deletingPost) {
      return;
    }

    deleteMutation.mutate(deletingPost.id, {
      onSuccess: () => {
        setDeletingPost(null);
      },
    });
  };

  const handleApprove = (id: string) => {
    moderateMutation.mutate({
      id,
      payload: { status: 'APPROVED' },
    });
  };

  const handleReject = (id: string) => {
    setRejectingPostId(id);
    setRejectionReasonInput('');
  };

  const submitReject = () => {
    if (!rejectingPostId) {
      return;
    }

    const rejectionReason = rejectionReasonInput.trim();
    if (!rejectionReason) {
      return;
    }

    moderateMutation.mutate(
      {
        id: rejectingPostId,
        payload: {
          status: 'REJECTED',
          rejectionReason,
        },
      },
      {
        onSuccess: () => {
          setRejectingPostId(null);
          setRejectionReasonInput('');
        },
      },
    );
  };

  const isCreatePending = createMutation.isPending;
  const isUpdatePending = updateMutation.isPending;

  const tabItems: Array<{ key: 'mine' | 'pending' | 'published'; label: string; count: number }> = [
    { key: 'mine', label: 'Bài của tôi', count: myPosts.length },
    { key: 'pending', label: 'Chờ duyệt', count: canModerate ? pendingPosts.length : 0 },
    { key: 'published', label: 'Đã đăng', count: publishedPosts.length },
  ];

  const canShowPendingTab = canModerate;

  const renderStatusBadge = (post: PostItem) => (
    <Badge variant={statusVariantMap[post.status]}>{statusLabelMap[post.status]}</Badge>
  );

  const renderAudienceBadge = (post: PostItem) => (
    <Badge variant="outline">{audienceLabelMap[post.audience]}</Badge>
  );

  const canDeletePost = (post: PostItem) => {
    if (session?.role === 'DEAN') {
      return true;
    }

    return session?.userId === post.authorId;
  };

  const featuredPost = publishedPosts[0] ?? null;
  const headlinePosts = publishedPosts.slice(1);

  const navigateToPost = (postId: string) => {
    const basePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    router.push(`${basePath}/${postId}`);
  };

  return (
    <div className="space-y-8">
      {!isDean ? (
        <>
          {canCreate && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Bản tin</h2>
                <p className="text-sm text-muted-foreground">Đọc nhanh tin mới theo phong cách trang báo.</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm bài viết
              </Button>
            </div>
          )}

          {canCreate && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Bài viết của tôi</h3>
              {isMyPostsLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
              ) : myPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bạn chưa có bài viết nào.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myPosts.map((post) => (
                    <article key={post.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {renderAudienceBadge(post)}
                        {renderStatusBadge(post)}
                      </div>
                      <h4 className="line-clamp-2 text-base font-semibold">{post.title}</h4>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {summarizeContent(post.content, 120)}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatDateTime(post.createdAt)}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigateToPost(post.id)}>
                            Xem
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingPost(post)}>
                            <Pencil className="mr-1 h-4 w-4" />
                            Sửa
                          </Button>
                          {canDeletePost(post) && (
                            <Button variant="destructive" size="sm" onClick={() => setDeletingPost(post)}>
                              <Trash2 className="mr-1 h-4 w-4" />
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">Tin mới</h3>
            {isPublishedLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
            ) : publishedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có bài viết nào.</p>
            ) : (
              <div className="space-y-6">
                {featuredPost && (
                  <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                    {extractFirstImageSrc(featuredPost.content) ? (
                      <img
                        src={extractFirstImageSrc(featuredPost.content) ?? ''}
                        alt={featuredPost.title}
                        className="h-64 w-full object-cover md:h-80"
                      />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 md:h-56" />
                    )}
                    <div className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderAudienceBadge(featuredPost)}
                        <Badge variant="secondary">Bài nổi bật</Badge>
                      </div>
                      <h4 className="text-2xl font-semibold leading-tight">{featuredPost.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {summarizeContent(featuredPost.content, 260)}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {featuredPost.author.name} • {formatDateTime(featuredPost.publishedAt ?? featuredPost.createdAt)}
                        </span>
                        <Button onClick={() => navigateToPost(featuredPost.id)}>Đọc bài</Button>
                      </div>
                    </div>
                  </article>
                )}

                {headlinePosts.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {headlinePosts.map((post) => (
                      <article key={post.id} className="rounded-xl border bg-card p-4 shadow-sm">
                        {extractFirstImageSrc(post.content) ? (
                          <img
                            src={extractFirstImageSrc(post.content) ?? ''}
                            alt={post.title}
                            className="mb-3 h-44 w-full rounded-md object-cover"
                          />
                        ) : null}
                        <div className="mb-2 flex flex-wrap items-center gap-2">{renderAudienceBadge(post)}</div>
                        <h4 className="line-clamp-2 text-base font-semibold">{post.title}</h4>
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {summarizeContent(post.content, 140)}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(post.publishedAt ?? post.createdAt)}</span>
                          <Button variant="outline" size="sm" onClick={() => navigateToPost(post.id)}>
                            Đọc tiếp
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {canCreate && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Quản lý bài viết</h2>
                <p className="text-sm text-muted-foreground">Thêm, sửa, xóa bài viết bằng popup ngay tại trang này.</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm bài viết
              </Button>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-2">
              {tabItems
                .filter((tab) => (tab.key === 'pending' ? canShowPendingTab : true))
                .map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    variant={activeTab === tab.key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label} ({tab.count})
                  </Button>
                ))}
            </div>

            {activeTab === 'mine' && (
              <div className="rounded-lg border">
                {isMyPostsLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                ) : myPosts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Bạn chưa có bài viết nào.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tiêu đề</TableHead>
                        <TableHead>Đối tượng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày đăng</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="max-w-[320px] truncate font-medium">{post.title}</TableCell>
                          <TableCell>{renderAudienceBadge(post)}</TableCell>
                          <TableCell>{renderStatusBadge(post)}</TableCell>
                          <TableCell>{formatDateTime(post.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => navigateToPost(post.id)}>
                                Xem
                              </Button>
                              {isDean && (
                                <Button variant="outline" size="sm" onClick={() => setEditingPost(post)}>
                                  <Pencil className="mr-1 h-4 w-4" />
                                  Sửa
                                </Button>
                              )}
                              {canDeletePost(post) && (
                                <Button variant="destructive" size="sm" onClick={() => setDeletingPost(post)}>
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Xóa
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {activeTab === 'pending' && canModerate && (
              <div className="rounded-lg border">
                {isPendingLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                ) : pendingPosts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Không có bài viết nào cần duyệt.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tiêu đề</TableHead>
                        <TableHead>Tác giả</TableHead>
                        <TableHead>Đối tượng</TableHead>
                        <TableHead>Ngày gửi</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="max-w-[320px] truncate font-medium">{post.title}</TableCell>
                          <TableCell>{post.author.name}</TableCell>
                          <TableCell>{renderAudienceBadge(post)}</TableCell>
                          <TableCell>{formatDateTime(post.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => navigateToPost(post.id)}>
                                Xem
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(post.id)}
                                disabled={moderateMutation.isPending}
                              >
                                Duyệt
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReject(post.id)}
                                disabled={moderateMutation.isPending}
                              >
                                Từ chối
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {activeTab === 'published' && (
              <div className="rounded-lg border">
                {isPublishedLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                ) : publishedPosts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Chưa có bài viết nào.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tiêu đề</TableHead>
                        <TableHead>Tác giả</TableHead>
                        <TableHead>Đối tượng</TableHead>
                        <TableHead>Xuất bản</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {publishedPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="max-w-[320px] truncate font-medium">{post.title}</TableCell>
                          <TableCell>{post.author.name}</TableCell>
                          <TableCell>{renderAudienceBadge(post)}</TableCell>
                          <TableCell>{formatDateTime(post.publishedAt ?? post.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => navigateToPost(post.id)}>
                                Xem
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <PostFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
        initialPost={null}
        isPending={isCreatePending}
        meDepartmentName={me?.departmentRef?.name}
        onSubmit={onCreate}
      />

      <PostFormDialog
        open={Boolean(editingPost)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPost(null);
          }
        }}
        mode="edit"
        initialPost={editingPost}
        isPending={isUpdatePending}
        meDepartmentName={me?.departmentRef?.name}
        onSubmit={onUpdate}
      />

      <AlertDialog open={Boolean(deletingPost)} onOpenChange={(open) => !open && setDeletingPost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài viết &quot;{deletingPost?.title ?? ''}&quot; sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(rejectingPostId)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingPostId(null);
            setRejectionReasonInput('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhập lý do từ chối</DialogTitle>
            <DialogDescription>
              Lý do này sẽ được lưu lại để người đăng bài biết nguyên nhân bài bị từ chối.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Lý do</p>
            <Textarea
              value={rejectionReasonInput}
              onChange={(event) => setRejectionReasonInput(event.target.value)}
              placeholder="Ví dụ: Nội dung chưa đúng định dạng thông báo của khoa..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectingPostId(null);
                setRejectionReasonInput('');
              }}
              disabled={moderateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitReject}
              disabled={moderateMutation.isPending || rejectionReasonInput.trim().length === 0}
            >
              {moderateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}