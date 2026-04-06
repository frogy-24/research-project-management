'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PostAudience, PostItem } from '@/types/post.schema';
import { usePostById } from '@/hooks/usePosts';
import { PostContentRenderer } from '@/components/posts/post-content-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type PostDetailPageClientProps = {
  postId: string;
  backHref: string;
};

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

export function PostDetailPageClient({ postId, backHref }: PostDetailPageClientProps) {
  const { data: post, isLoading, isError } = usePostById(postId);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Đang tải bài viết...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Không thể tải bài viết hoặc bạn không có quyền xem bài này.
        </div>
      )}

      {post && (
        <article className="space-y-5 rounded-xl border bg-card p-5 shadow-sm md:p-7">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{audienceLabelMap[post.audience]}</Badge>
              <Badge variant={statusVariantMap[post.status]}>{statusLabelMap[post.status]}</Badge>
              {post.department && <Badge variant="secondary">Khoa: {post.department.name}</Badge>}
            </div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              Đăng bởi {post.author.name} • {formatDateTime(post.publishedAt ?? post.createdAt)}
            </p>
          </header>

          <div className="max-h-[72vh] overflow-auto rounded-md border p-4">
            <PostContentRenderer content={post.content} />
          </div>
        </article>
      )}
    </div>
  );
}
