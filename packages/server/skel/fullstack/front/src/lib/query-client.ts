import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // a 404 or a validation error will not fix itself on retry
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.problem.status < 500) && failureCount < 2,
    },
  },
});
