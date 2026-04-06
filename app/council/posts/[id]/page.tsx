import { PostDetailPageClient } from '@/components/posts/post-detail-page-client';

type PageProps = { params: Promise<{ id: string }> };

export default async function CouncilPostDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PostDetailPageClient postId={id} backHref="/council/posts" />;
}
