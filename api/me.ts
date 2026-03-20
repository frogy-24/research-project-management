import { api } from "@/lib/axios";
import { userSchema, type User } from "@/types/user.schema";
import { updateProfileSchema, type UpdateProfileInput } from "@/types/profile.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

export const meApi = {
  get: async (): Promise<User> => {
    const response = await api.get<ApiSuccess<User>>("/me");
    return userSchema.parse(response.data.data);
  },

  update: async (payload: UpdateProfileInput): Promise<User> => {
    const validated = updateProfileSchema.parse(payload);
    const response = await api.patch<ApiSuccess<User>>("/me", validated);
    return userSchema.parse(response.data.data);
  },
};
