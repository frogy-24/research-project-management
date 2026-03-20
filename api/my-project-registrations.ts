import { api } from "@/lib/axios";
import {
  cancelProjectRegistrationSchema,
  createProjectRegistrationSchema,
  projectRegistrationSchema,
  type CancelProjectRegistrationInput,
  type CreateProjectRegistrationInput,
  type ProjectRegistration,
} from "@/types/project-registration.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

export const myProjectRegistrationsApi = {
  list: async (): Promise<ProjectRegistration[]> => {
    const response = await api.get<ApiSuccess<ProjectRegistration[]>>("/my-project-registrations");
    return projectRegistrationSchema.array().parse(response.data.data);
  },

  create: async (payload: CreateProjectRegistrationInput): Promise<ProjectRegistration> => {
    const validated = createProjectRegistrationSchema.parse(payload);
    const response = await api.post<ApiSuccess<ProjectRegistration>>(
      "/my-project-registrations",
      validated
    );
    return projectRegistrationSchema.parse(response.data.data);
  },

  cancel: async (
    id: string,
    payload: CancelProjectRegistrationInput
  ): Promise<ProjectRegistration> => {
    const validated = cancelProjectRegistrationSchema.parse(payload);
    const response = await api.patch<ApiSuccess<ProjectRegistration>>(
      `/my-project-registrations/${id}`,
      validated
    );
    return projectRegistrationSchema.parse(response.data.data);
  },
};
