import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meApi } from "@/api/me";
import type { UpdateProfileInput } from "@/types/profile.schema";

export const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: meApi.get,
  });
};

export const useUpdateMe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfileInput) => meApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};
