// api/call-rounds-approval.ts
import { api } from '@/lib/axios';

export async function approveCallRound(id: string, note?: string) {
  const { data } = await api.post(`/call-rounds/${id}/approve`, {
    action: 'approve',
    note,
  });
  return data;
}

export async function rejectCallRound(id: string, note?: string) {
  const { data } = await api.post(`/call-rounds/${id}/approve`, {
    action: 'reject',
    note,
  });
  return data;
}
