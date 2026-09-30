import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EnquiryStatus } from '../lib/constants';
import { API_BASE, api, uploadWithProgress } from './client';
import type {
  AdminDestination,
  AdminPackage,
  AdminSiteContent,
  AdminTraveller,
  DestinationInput,
  PackageInput,
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

// ── Destinations ──
function invalidateCatalog(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'destinations'] });
  qc.invalidateQueries({ queryKey: ['admin', 'packages'] });
  qc.invalidateQueries({ queryKey: ['admin', 'media'] });
  qc.invalidateQueries({ queryKey: ['destinations'] });
  qc.invalidateQueries({ queryKey: ['destination'] });
  qc.invalidateQueries({ queryKey: ['packages'] });
  qc.invalidateQueries({ queryKey: ['package'] });
}

export const useAdminDestinations = () =>
  useQuery({ queryKey: ['admin', 'destinations'], queryFn: () => api<AdminDestination[]>('/admin/destinations', A) });

export const useAdminDestination = (id: string | undefined) =>
  useQuery({ queryKey: ['admin', 'destination', id], queryFn: () => api<AdminDestination>(`/admin/destinations/${id}`, A), enabled: !!id && id !== 'new' });

export function useSaveDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: DestinationInput }) =>
      api<AdminDestination>(id ? `/admin/destinations/${id}` : '/admin/destinations', { ...A, method: id ? 'PUT' : 'POST', body }),
    onSuccess: (d) => {
      qc.setQueryData(['admin', 'destination', d.id], d);
      invalidateCatalog(qc);
    },
  });
}

export function usePublishDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api<AdminDestination>(`/admin/destinations/${id}/publish`, { ...A, method: 'PATCH', body: { published } }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

export function useReorderDestinations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api<AdminDestination[]>('/admin/destinations/reorder', { ...A, method: 'PUT', body: { ids } }),
    onSuccess: (list) => {
      qc.setQueryData(['admin', 'destinations'], list);
      invalidateCatalog(qc);
    },
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/admin/destinations/${id}`, { ...A, method: 'DELETE' }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

// ── Packages ──
export const useAdminPackages = () => useQuery({ queryKey: ['admin', 'packages'], queryFn: () => api<AdminPackage[]>('/admin/packages', A) });

export const useAdminPackage = (id: string | undefined) =>
  useQuery({ queryKey: ['admin', 'package', id], queryFn: () => api<AdminPackage>(`/admin/packages/${id}`, A), enabled: !!id && id !== 'new' });

export function useSavePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PackageInput }) =>
      api<AdminPackage>(id ? `/admin/packages/${id}` : '/admin/packages', { ...A, method: id ? 'PUT' : 'POST', body }),
    onSuccess: (p) => {
      qc.setQueryData(['admin', 'package', p.id], p);
      invalidateCatalog(qc);
    },
  });
}

export function usePublishPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api<AdminPackage>(`/admin/packages/${id}/publish`, { ...A, method: 'PATCH', body: { published } }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

export function useDuplicatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<AdminPackage>(`/admin/packages/${id}/duplicate`, { ...A, method: 'POST' }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/admin/packages/${id}`, { ...A, method: 'DELETE' }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

// ── Travellers ──
export const useTravellers = (f: { q?: string; page?: number }) =>
  useQuery({
    queryKey: ['admin', 'travellers', f],
    queryFn: () => api<Paginated<AdminTraveller>>(`/admin/travellers${toQuery(f as EnquiryFilters)}`, A),
    placeholderData: keepPreviousData,
  });

export const useTraveller = (id: string | undefined) =>
  useQuery({ queryKey: ['admin', 'traveller', id], queryFn: () => api<AdminTraveller>(`/admin/travellers/${id}`, A), enabled: !!id });

export function useBlockTraveller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => api<AdminTraveller>(`/admin/travellers/${id}`, { ...A, method: 'PATCH', body: { blocked } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'traveller'] }).then(() => qc.invalidateQueries({ queryKey: ['admin', 'travellers'] })),
  });
}

export { API_BASE };
