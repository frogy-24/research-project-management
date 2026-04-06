import { PostsPageClient } from '@/components/posts/posts-page-client';

export default function StudentPostsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bảng tin bài viết</h1>
        <p className="text-muted-foreground">
          Xem các bài viết dành cho học sinh, khoa hoặc toàn trường đã được phê duyệt.
        </p>
      </div>

      <PostsPageClient />
    </div>
  );
}
