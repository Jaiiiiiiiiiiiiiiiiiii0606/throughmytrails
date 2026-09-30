import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { DEFAULT_SITE_CONTENT } from '../lib/defaults';
import { api } from './client';
import type { DestinationDetail, DestinationList, EnquiryCreated, EnquiryInput, PackageDetail, PackageList, PublicSiteContent } from './types';

/** Site content with built-in defaults, so the page renders instantly and still works if the API is down. */
export function useSiteContent() {
  const q = useQuery({
    queryKey: ['site-content'],
    queryFn: () => api<PublicSiteContent>('/public/site-content'),
    staleTime: 60_000,
    retry: 1,
  });
  return { ...q, content: q.data ?? DEFAULT_SITE_CONTENT };
}

export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: (input: EnquiryInput) => api<EnquiryCreated>('/enquiries', { method: 'POST', body: input }),
  });
}

// ── Catalogue ──

export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: () => api<DestinationList>('/public/destinations'),
    staleTime: 5 * 60_000,
  });
}

export function useDestination(slug: string | undefined) {
  return useQuery({
    queryKey: ['destination', slug],
    queryFn: () => api<DestinationDetail>(`/public/destinations/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export interface PackageFilters {
  destination?: string;
  band?: string;
  companion?: string;
}

export function usePackages(f: PackageFilters = {}) {
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => !!v) as [string, string][]).toString();
  return useQuery({
    queryKey: ['packages', f],
    queryFn: () => api<PackageList>(`/public/packages${qs ? `?${qs}` : ''}`),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePackage(slug: string | undefined) {
  return useQuery({
    queryKey: ['package', slug],
    queryFn: () => api<PackageDetail>(`/public/packages/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
