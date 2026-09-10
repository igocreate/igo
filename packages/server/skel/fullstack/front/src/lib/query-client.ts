import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // un 404 ou une erreur de validation ne se corrigera pas en réessayant
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.problem.status < 500) && failureCount < 2,
    },
  },
});
