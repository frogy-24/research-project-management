import { z } from 'zod';
import { RoleEnum } from '@/types/user.schema';

export const PostAudienceEnum = z.enum(['LECTURERS', 'STUDENTS', 'DEPARTMENT', 'ALL']);
export const PostStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const postUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  role: RoleEnum,
  departmentId: z.string().cuid().nullable(),
});

const postDepartmentSchema = z.object({
  id: z.string().cuid(),
  code: z.string(),
  name: z.string(),
});

export const postSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  audience: PostAudienceEnum,
  status: PostStatusEnum,
  authorId: z.string().cuid(),
  authorRole: RoleEnum,
  departmentId: z.string().cuid().nullable(),
  approvedById: z.string().cuid().nullable(),
  approvedAt: z.coerce.date().nullable(),
  rejectionReason: z.string().nullable(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  author: postUserSchema,
  approvedBy: postUserSchema.nullable(),
  department: postDepartmentSchema.nullable(),
});

export const postListSchema = z.array(postSchema);

const htmlTagRegex = /<[^>]+>/g;
const mediaContentRegex = /<img\b[^>]*>|<a\b[^>]*href=["'][^"']+["'][^>]*>/i;

function extractPlainTextFromHtml(content: string): string {
  return content.replace(htmlTagRegex, ' ').replace(/\s+/g, ' ').trim();
}

export const createPostSchema = z.object({
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(200),
  content: z
    .string()
    .max(120000, 'Nội dung bài viết quá dài')
    .superRefine((content, ctx) => {
      const plainText = extractPlainTextFromHtml(content);
      const hasMedia = mediaContentRegex.test(content);

      if (plainText.length < 10 && !hasMedia) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nội dung phải có ít nhất 10 ký tự hoặc có ảnh/tài liệu đính kèm',
        });
      }
    }),
  audience: PostAudienceEnum,
});

export const updatePostSchema = createPostSchema;

export const moderatePostSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'REJECTED' && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập lý do từ chối',
        path: ['rejectionReason'],
      });
    }
  });

export type PostAudience = z.infer<typeof PostAudienceEnum>;
export type PostStatus = z.infer<typeof PostStatusEnum>;
export type PostItem = z.infer<typeof postSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ModeratePostInput = z.infer<typeof moderatePostSchema>;
