import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/posts';
import type { CreatePostInput, ModeratePostInput } from '@/types/post.schema';

const PUBLISHED_POSTS_QUERY_KEY = ['posts', 'published'] as const;
const MY_POSTS_QUERY_KEY = ['posts', 'mine'] as const;
const PENDING_POSTS_QUERY_KEY = ['posts', 'pending-dean'] as const;

export function usePublishedPosts() {
  return useQuery({
    queryKey: PUBLISHED_POSTS_QUERY_KEY,
    queryFn: postsApi.listPublished,
  });
}

export function useMyPosts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MY_POSTS_QUERY_KEY,
    queryFn: postsApi.listMine,
    enabled: options?.enabled ?? true,
  });
}

export function usePendingPostsForDean(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: PENDING_POSTS_QUERY_KEY,
    queryFn: postsApi.listPendingForDean,
    enabled: options?.enabled ?? true,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostInput) => postsApi.create(payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLISHED_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_POSTS_QUERY_KEY }),
      ]);

      if (data.status === 'PENDING') {
        toast.success('Bài viết đã gửi thành công và đang chờ Trưởng khoa duyệt');
        return;
      }

      toast.success('Đăng bài viết thành công');
    },
    onError: () => {
      toast.error('Đăng bài viết thất bại');
    },
  });
}

export function useModeratePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModeratePostInput }) =>
      postsApi.moderate(id, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLISHED_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_POSTS_QUERY_KEY }),
      ]);

      if (data.status === 'APPROVED') {
        toast.success('Đã duyệt bài viết');
      } else {
        toast.success('Đã từ chối bài viết');
      }
    },
    onError: () => {
      toast.error('Xử lý kiểm duyệt thất bại');
    },
  });
}
