'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import {
  useCreatePost,
  useModeratePost,
  useMyPosts,
  usePendingPostsForDean,
  usePublishedPosts,
} from '@/hooks/usePosts';
import {
  createPostSchema,
  type CreatePostInput,
  type PostAudience,
  type PostItem,
} from '@/types/post.schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Separator } from '@/components/ui/separator';

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

function PostCard({ post }: { post: PostItem }) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{audienceLabelMap[post.audience]}</Badge>
          <Badge variant={statusVariantMap[post.status]}>{statusLabelMap[post.status]}</Badge>
          {post.department && <Badge variant="secondary">Khoa: {post.department.name}</Badge>}
        </div>
        <CardTitle className="text-xl">{post.title}</CardTitle>
        <CardDescription>
          Đăng bởi {post.author.name} ({post.author.role}) • {formatDateTime(post.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
        {post.status === 'REJECTED' && post.rejectionReason && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Lý do từ chối: {post.rejectionReason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PostsPageClient() {
  const { data: session } = useAuthSession();
  const { data: me } = useMe();

  const canCreate = session?.role === 'DEAN' || session?.role === 'LECTURER';
  const canModerate = session?.role === 'DEAN' || session?.role === 'ADMIN';

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '',
      audience: 'ALL',
    },
  });

  const createMutation = useCreatePost();
  const moderateMutation = useModeratePost();

  const { data: publishedPosts = [], isLoading: isPublishedLoading } = usePublishedPosts();
  const { data: myPosts = [], isLoading: isMyPostsLoading } = useMyPosts({ enabled: canCreate });
  const { data: pendingPosts = [], isLoading: isPendingLoading } = usePendingPostsForDean({
    enabled: canModerate,
  });

  const audienceOptions = useMemo(
    () => [
      { value: 'LECTURERS' as const, label: audienceLabelMap.LECTURERS },
      { value: 'STUDENTS' as const, label: audienceLabelMap.STUDENTS },
      { value: 'DEPARTMENT' as const, label: audienceLabelMap.DEPARTMENT },
      { value: 'ALL' as const, label: audienceLabelMap.ALL },
    ],
    [],
  );

  const onSubmit = (values: CreatePostInput) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset({
          title: '',
          content: '',
          audience: 'ALL',
        });
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
    const rejectionReason = window.prompt('Nhập lý do từ chối bài viết:')?.trim();
    if (!rejectionReason) {
      return;
    }

    moderateMutation.mutate({
      id,
      payload: {
        status: 'REJECTED',
        rejectionReason,
      },
    });
  };

  return (
    <div className="space-y-8">
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Đăng bài viết mới</CardTitle>
            <CardDescription>
              Trưởng khoa đăng bài sẽ hiển thị ngay. Bài viết của giảng viên sẽ chờ Trưởng khoa duyệt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Textarea
                          rows={6}
                          placeholder="Nhập nội dung bài viết"
                          {...field}
                          value={field.value ?? ''}
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
                          {audienceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.watch('audience') === 'DEPARTMENT' && (
                        <p className="text-xs text-muted-foreground">
                          Bài viết sẽ hiển thị cho người dùng thuộc khoa: {me?.departmentRef?.name ?? 'Chưa xác định'}.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Đăng bài
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {canCreate && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Bài viết của tôi</h2>
          {isMyPostsLoading && <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
          {!isMyPostsLoading && myPosts.length === 0 && (
            <p className="text-sm text-muted-foreground">Bạn chưa có bài viết nào.</p>
          )}
          <div className="space-y-4">
            {myPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {canModerate && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Bài viết chờ duyệt</h2>
          {isPendingLoading && <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
          {!isPendingLoading && pendingPosts.length === 0 && (
            <p className="text-sm text-muted-foreground">Không có bài viết nào cần duyệt.</p>
          )}
          <div className="space-y-4">
            {pendingPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{audienceLabelMap[post.audience]}</Badge>
                    {post.department && <Badge variant="secondary">Khoa: {post.department.name}</Badge>}
                  </div>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription>
                    Tác giả: {post.author.name} ({post.author.role}) • {formatDateTime(post.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
                  <div className="flex flex-wrap gap-2">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Bài viết đã đăng</h2>
        {isPublishedLoading && <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
        {!isPublishedLoading && publishedPosts.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có bài viết nào.</p>
        )}
        <div className="space-y-4">
          {publishedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
