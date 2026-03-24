import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { myProjectRegistrationsApi } from '@/api/my-project-registrations';
import type {
    CancelProjectRegistrationInput,
    CreateProjectRegistrationInput,
    UpdateProjectRegistrationInput,
} from '@/types/project-registration.schema';

const queryKey = ['my-project-registrations'] as const;

export const useMyProjectRegistrations = () => {
    return useQuery({
        queryKey,
        queryFn: myProjectRegistrationsApi.list,
    });
};

export const useCreateMyProjectRegistration = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateProjectRegistrationInput) => myProjectRegistrationsApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
};

export const useCancelMyProjectRegistration = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CancelProjectRegistrationInput }) =>
            myProjectRegistrationsApi.cancel(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
};

export const useUpdateMyProjectRegistration = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectRegistrationInput }) =>
            myProjectRegistrationsApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
};
