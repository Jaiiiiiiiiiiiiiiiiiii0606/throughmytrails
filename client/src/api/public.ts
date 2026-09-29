import { useMutation, useQuery } from '@tanstack/react-query';
import { DEFAULT_SITE_CONTENT } from '../lib/defaults';
import { api } from './client';
import type { EnquiryCreated, EnquiryInput, PublicSiteContent } from './types';

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
