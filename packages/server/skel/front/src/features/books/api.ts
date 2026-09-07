import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { Book, BooksPage, CreateBook } from './types';

const keys = {
  all:  ['books'] as const,
  list: (page: number) => ['books', { page }] as const,
};

export function useBooks(page = 1) {
  return useQuery({
    queryKey: keys.list(page),
    queryFn:  () => apiClient.get<BooksPage>(`/api/books?page=${page}`),
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (book: CreateBook) => apiClient.post<Book>('/api/books', book),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}
