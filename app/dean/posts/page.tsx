import { PostsPageClient } from '@/components/posts/posts-page-client';

export default function DeanPostsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bài viết khoa và toàn trường</h1>
        <p className="text-muted-foreground">
          Trưởng khoa có thể đăng bài trực tiếp và kiểm duyệt bài viết do giảng viên gửi lên.
        </p>
      </div>

      <PostsPageClient />
    </div>
  );
}
