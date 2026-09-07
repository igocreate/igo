import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@/components/layout/app-layout';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // lazy per feature: a route is only downloaded when it is visited
      { index: true, lazy: () => import('@/features/books/pages/books-page') },
    ],
  },
]);
