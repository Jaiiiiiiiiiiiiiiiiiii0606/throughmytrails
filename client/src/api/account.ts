import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTraveller } from '../auth/TravellerAuth';
import { api } from './client';
import type { AuthConfig, DestinationCard, MyTrip, Traveller, TripRequestInput } from './types';

const U = { auth: 'user' } as const;

export const useAuthConfig = () =>
  useQuery({ queryKey: ['auth-config'], queryFn: () => api<AuthConfig>('/account/auth/config'), staleTime: 60 * 60_000 });

export function useMyTrips() {
  const { status } = useTraveller();
  return useQuery({ queryKey: ['account', 'trips'], queryFn: () => api<MyTrip[]>('/account/trips', U), enabled: status === 'authed' });
}

export function useSavedDestinations() {
  const { status } = useTraveller();
  return useQuery({ queryKey: ['account', 'saved'], queryFn: () => api<DestinationCard[]>('/account/saved', U), enabled: status === 'authed' });
}

export function useUpdateProfile() {
  const { setUser } = useTraveller();
  return useMutation({
    mutationFn: (body: Partial<Pick<Traveller, 'name' | 'phone' | 'homeCity'>> & { preferences?: Partial<Traveller['preferences']> }) =>
      api<Traveller>('/account/me', { ...U, method: 'PATCH', body }),
    onSuccess: (u) => setUser(u),
  });
}

/** Optimistic heart toggle; the server's list is the source of truth once it answers. */
export function useToggleSaved() {
  const { user, setUser } = useTraveller();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      api<{ savedDestinations: string[] }>(`/account/saved/${id}`, { ...U, method: saved ? 'PUT' : 'DELETE' }),
    onMutate: ({ id, saved }) => {
      if (!user) return undefined;
      const before = user.savedDestinations;
      setUser({ ...user, savedDestinations: saved ? [...before, id] : before.filter((x) => x !== id) });
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (user && ctx) setUser({ ...user, savedDestinations: ctx.before });
    },
    onSuccess: (r) => {
      if (user) setUser({ ...user, savedDestinations: r.savedDestinations });
      qc.invalidateQueries({ queryKey: ['account', 'saved'] });
    },
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const { refresh } = useTraveller();
  return useMutation({
    mutationFn: (body: TripRequestInput) => api<MyTrip>('/account/trips', { ...U, method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account', 'trips'] });
      // Phone and preferences may have been saved to the profile.
      refresh();
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: () => api('/account/me', { ...U, method: 'DELETE', body: { confirm: 'DELETE' } }) });
}
