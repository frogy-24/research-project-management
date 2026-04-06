import { PostsPageClient } from '@/components/posts/posts-page-client';

export default function LecturerPostsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bảng tin bài viết</h1>
        <p className="text-muted-foreground">
          Giảng viên có thể gửi bài viết để Trưởng khoa duyệt và xem các bài viết đã được công bố.
        </p>
      </div>

      <PostsPageClient />
    </div>
  );
}
