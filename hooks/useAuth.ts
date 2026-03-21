import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import type { Role } from "@/types/user.schema";
import type { LoginWithCredentials } from "@/types/auth.schema";

export const useAuthSession = () => {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: authApi.session,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginWithCredentials) => authApi.loginWithCredentials(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useLoginAsRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (role: Role) => authApi.loginAsRole(role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
