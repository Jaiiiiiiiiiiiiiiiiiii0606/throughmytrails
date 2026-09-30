// Base tokens first so page stylesheets (loaded through the routes) can override them.
import './theme/tokens.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ApiError } from './api/client';
import { TravellerAuthProvider } from './auth/TravellerAuth';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Don't retry client errors (401/403/404); do retry flaky network once.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TravellerAuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </TravellerAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
