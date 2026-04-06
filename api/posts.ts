import { api } from '@/lib/axios';
import {
  createPostSchema,
  moderatePostSchema,
  postListSchema,
  postSchema,
  type CreatePostInput,
  type ModeratePostInput,
  type PostItem,
} from '@/types/post.schema';

export const postsApi = {
  listPublished: async (): Promise<PostItem[]> => {
    const response = await api.get('/posts');
    return postListSchema.parse(response.data);
  },

  listMine: async (): Promise<PostItem[]> => {
    const response = await api.get('/posts?mine=true');
    return postListSchema.parse(response.data);
  },

  create: async (payload: CreatePostInput): Promise<PostItem> => {
    const validated = createPostSchema.parse(payload);
    const response = await api.post('/posts', validated);
    return postSchema.parse(response.data);
  },

  listPendingForDean: async (): Promise<PostItem[]> => {
    const response = await api.get('/dean/posts');
    return postListSchema.parse(response.data);
  },

  moderate: async (id: string, payload: ModeratePostInput): Promise<PostItem> => {
    const validated = moderatePostSchema.parse(payload);
    const response = await api.patch(`/dean/posts/${id}`, validated);
    return postSchema.parse(response.data);
  },
};
