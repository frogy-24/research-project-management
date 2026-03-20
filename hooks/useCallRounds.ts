import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callRoundsApi } from "@/api/call-rounds";
import type { CreateCallRoundInput, UpdateCallRoundInput } from "@/types/call-round.schema";

export function useCallRounds() {
  return useQuery({
    queryKey: ["call-rounds"],
    queryFn: callRoundsApi.getAll,
  });
}

export function useCreateCallRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callRoundsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-rounds"] });
    },
  });
}

export function useUpdateCallRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callRoundsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-rounds"] });
    },
  });
}

export function useDeleteCallRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callRoundsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-rounds"] });
    },
  });
}
