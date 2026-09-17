import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('affiche les erreurs de validation sous les champs nommés par le serveur', async () => {
    server.use(
      http.post('/api/books', () =>
        HttpResponse.json(
          {
            type: 'urn:igo:validation-failed',
            title: 'Validation failed',
            status: 400,
            errors: [{ path: 'title', code: 'too_small', message: 'Too small' }],
          },
          { status: 400 },
        ),
      ),
    );

    renderWithProviders(<BooksPage />);
    await screen.findByText('Dune');

    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Too small')).toBeInTheDocument();
  });

  it('signale un échec qui ne vise aucun champ', async () => {
    server.use(
      http.post('/api/books', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Internal Server Error', status: 500 },
          {
            status: 500,
            headers: { traceresponse: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00' },
          },
        ),
      ),
    );

    renderWithProviders(<BooksPage />);
    await screen.findByText('Dune');

    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    const alert = await screen.findByText(/l'ajout a échoué/i);
    expect(alert).toHaveTextContent('0af7651916cd43dd8448eb211c80319c');
  });

  it('ajoute un livre et rafraîchit la liste', async () => {
    renderWithProviders(<BooksPage />);
    await screen.findByText('Dune');

    await userEvent.type(screen.getByLabelText(/titre/i), 'Neuromancer');
    await userEvent.type(screen.getByLabelText(/auteur/i), 'Gibson');
    await userEvent.type(screen.getByLabelText(/pages/i), '271');
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    await waitFor(() => expect(screen.getByLabelText(/titre/i)).toHaveValue(''));
  });
});
