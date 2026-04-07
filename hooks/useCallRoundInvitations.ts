import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export type CallRoundInvitation = {
  id: string;
  callRoundId: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  callRound: {
    id: string;
    name: string;
    description: string | null;
    registrationStartDate: Date;
    registrationEndDate: Date;
    projectStartDate: Date | null;
    projectEndDate: Date | null;
    defenseDate: Date | null;
    invitationDeadline: Date | null;
    applicableFor: string;
    approvalStatus: string;
  };
};

type LecturerInvitationsData = {
  instructorInvitations: CallRoundInvitation[];
  councilMemberInvitations: CallRoundInvitation[];
};

export function useCallRoundInvitations() {
  return useQuery({
    queryKey: ['lecturer-call-round-invitations'],
    queryFn: async () => {
      const response = await api.get('/lecturer/call-round-invitations');
      return response.data.data as LecturerInvitationsData;
    },
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      invitationType,
      status,
    }: {
      invitationId: string;
      invitationType: 'INSTRUCTOR' | 'COUNCIL_MEMBER';
      status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
    }) => {
      const response = await api.patch('/lecturer/call-round-invitations', {
        invitationId,
        invitationType,
        status,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-call-round-invitations'] });
      if (variables.status === 'ACCEPTED') {
        toast.success('Đã đồng ý tham gia đợt đăng ký.');
      } else if (variables.status === 'REJECTED') {
        toast.info('Đã từ chối tham gia đợt đăng ký.');
      } else {
        toast.success('Đã hủy lời đồng ý.');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Không thể phản hồi lời mời.');
    },
  });
}