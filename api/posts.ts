import { api } from '@/lib/axios';
import {
    createPostSchema,
    moderatePostSchema,
    postListSchema,
    postSchema,
    updatePostSchema,
    type CreatePostInput,
    type ModeratePostInput,
    type PostItem,
    type UpdatePostInput,
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

    getById: async (id: string): Promise<PostItem> => {
        const response = await api.get(`/posts/${id}`);
        return postSchema.parse(response.data);
    },

    create: async (payload: CreatePostInput): Promise<PostItem> => {
        const validated = createPostSchema.parse(payload);
        const response = await api.post('/posts', validated);
        return postSchema.parse(response.data);
    },

    update: async (id: string, payload: UpdatePostInput): Promise<PostItem> => {
        const validated = updatePostSchema.parse(payload);
        const response = await api.patch(`/posts/${id}`, validated);
        return postSchema.parse(response.data);
    },

    remove: async (id: string): Promise<void> => {
        await api.delete(`/posts/${id}`);
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
