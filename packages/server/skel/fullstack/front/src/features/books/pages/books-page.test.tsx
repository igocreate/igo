import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';

import { BooksPage } from './books-page';

describe('BooksPage', () => {
  it('affiche les livres une fois chargés', async () => {
    renderWithProviders(<BooksPage />);

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
  });

  it('signale une erreur serveur au lieu de charger sans fin', async () => {
    server.use(
      http.get('/api/books', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Internal Server Error', status: 500 },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<BooksPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/internal server error/i);
  });
});
