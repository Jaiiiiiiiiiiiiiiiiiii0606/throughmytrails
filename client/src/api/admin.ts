import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EnquiryStatus } from '../lib/constants';
import { API_BASE, api, uploadWithProgress } from './client';
import type {
  AdminSiteContent,
  Enquiry,
  EnquiryFilters,
  EnquirySummary,
  MailStatus,
  MediaItem,
  Paginated,
  SiteContentUpdate,
  Stats,
} from './types';

const A = { auth: true } as const;

export function toQuery(f: EnquiryFilters): string {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── Dashboard ──
export const useStats = () =>
  useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api<Stats>('/admin/stats', A), refetchInterval: 60_000 });

// ── Enquiries ──
export const useEnquiries = (f: EnquiryFilters) =>
  useQuery({
    queryKey: ['admin', 'enquiries', f],
    queryFn: () => api<Paginated<EnquirySummary>>(`/admin/enquiries${toQuery(f)}`, A),
    placeholderData: keepPreviousData,
  });

export const useEnquiry = (id: string | undefined) =>
  useQuery({
    queryKey: ['admin', 'enquiry', id],
    queryFn: () => api<Enquiry>(`/admin/enquiries/${id}`, A),
    enabled: !!id,
  });

function useEnquiryMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'id' in data) qc.setQueryData(['admin', 'enquiry', (data as unknown as Enquiry).id], data);
      qc.invalidateQueries({ queryKey: ['admin', 'enquiries'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export const useUpdateEnquiry = () =>
  useEnquiryMutation(({ id, ...body }: { id: string } & Partial<Omit<Enquiry, 'id' | 'notes'>>) =>
    api<Enquiry>(`/admin/enquiries/${id}`, { ...A, method: 'PATCH', body }),
  );

export const useAddNote = () =>
  useEnquiryMutation(({ id, text }: { id: string; text: string }) =>
    api<Enquiry>(`/admin/enquiries/${id}/notes`, { ...A, method: 'POST', body: { text } }),
  );

export const useResendEmail = () =>
  useEnquiryMutation((id: string) => api<Enquiry>(`/admin/enquiries/${id}/resend-email`, { ...A, method: 'POST' }));

export const useBulkStatus = () =>
  useEnquiryMutation((body: { ids: string[]; status: EnquiryStatus }) =>
    api<{ matched: number; modified: number }>('/admin/enquiries/bulk-status', { ...A, method: 'PATCH', body }),
  );

export const useDeleteEnquiry = () =>
  useEnquiryMutation((id: string) => api(`/admin/enquiries/${id}`, { ...A, method: 'DELETE' }));

/** Downloads the CSV for the current filters (authenticated, so via fetch + blob). */
export async function downloadEnquiriesCsv(f: EnquiryFilters) {
  const { page: _p, limit: _l, ...filters } = f;
  const res = await api<Response>(`/admin/enquiries/export.csv${toQuery(filters)}`, { ...A, raw: true, headers: { Accept: 'text/csv' } });
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'enquiries.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Media ──
export const useMedia = () => useQuery({ queryKey: ['admin', 'media'], queryFn: () => api<MediaItem[]>('/admin/media', A) });

export function uploadMedia(files: File[], alts: string[], onProgress: (f: number) => void) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('alts', JSON.stringify(alts));
  return uploadWithProgress<MediaItem[]>('/admin/media', form, onProgress);
}

export const useUpdateMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) => api<MediaItem>(`/admin/media/${id}`, { ...A, method: 'PATCH', body: { alt } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      qc.invalidateQueries({ queryKey: ['admin', 'site-content'] });
    },
  });
};

export const useDeleteMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api<{ ok: true; unassigned: string[] }>(`/admin/media/${id}${force ? '?force=true' : ''}`, { ...A, method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      qc.invalidateQueries({ queryKey: ['admin', 'site-content'] });
      qc.invalidateQueries({ queryKey: ['site-content'] });
    },
  });
};

// ── Site content ──
export const useAdminSiteContent = () =>
  useQuery({ queryKey: ['admin', 'site-content'], queryFn: () => api<AdminSiteContent>('/admin/site-content', A) });

export const useUpdateSiteContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SiteContentUpdate) => api<AdminSiteContent>('/admin/site-content', { ...A, method: 'PUT', body }),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'site-content'], data);
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      qc.invalidateQueries({ queryKey: ['site-content'] });
    },
  });
};

// ── Settings ──
export const useMailStatus = () =>
  useQuery({ queryKey: ['admin', 'mail-status'], queryFn: () => api<MailStatus>('/admin/settings/mail', A) });

export const useSendTestEmail = () =>
  useMutation({
    mutationFn: (to?: string) => api<{ ok: true; to: string }>('/admin/settings/test-email', { ...A, method: 'POST', body: to ? { to } : {} }),
  });

export const useChangePassword = () =>
  useMutation({
    // The server signs out every session on a password change; the caller then asks for a fresh sign-in.
    mutationFn: (body: { currentPassword: string; newPassword: string }) => api('/admin/me/password', { ...A, method: 'PATCH', body }),
  });

export { API_BASE };
