import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/api/posts';
import type { CreatePostInput, ModeratePostInput, UpdatePostInput } from '@/types/post.schema';

const PUBLISHED_POSTS_QUERY_KEY = ['posts', 'published'] as const;
const MY_POSTS_QUERY_KEY = ['posts', 'mine'] as const;
const PENDING_POSTS_QUERY_KEY = ['posts', 'pending-dean'] as const;
const POST_DETAIL_QUERY_KEY = (id: string) => ['posts', 'detail', id] as const;

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

export function usePostById(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: POST_DETAIL_QUERY_KEY(id),
    queryFn: () => postsApi.getById(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
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

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePostInput }) =>
      postsApi.update(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLISHED_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_POSTS_QUERY_KEY }),
      ]);

      toast.success('Cập nhật bài viết thành công');
    },
    onError: () => {
      toast.error('Cập nhật bài viết thất bại');
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLISHED_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_POSTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_POSTS_QUERY_KEY }),
      ]);

      toast.success('Đã xóa bài viết');
    },
    onError: () => {
      toast.error('Xóa bài viết thất bại');
    },
  });
}
