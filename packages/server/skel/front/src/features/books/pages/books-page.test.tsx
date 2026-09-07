import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';

import { BooksPage } from './books-page';

describe('BooksPage', () => {

  it('should show the books once loaded', async () => {
    renderWithProviders(<BooksPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
  });

  it('should report a server error instead of loading forever', async () => {
    server.use(http.get('/api/books', () =>
      HttpResponse.json(
        { type: 'about:blank', title: 'Internal Server Error', status: 500 },
        { status: 500 }
      )
    ));

    renderWithProviders(<BooksPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/internal server error/i);
  });

  it('should show validation errors under the fields the server named', async () => {
    server.use(http.post('/api/books', () =>
      HttpResponse.json({
        type:   'urn:igo:validation-failed',
        title:  'Validation failed',
        status: 400,
        errors: [{ path: 'title', code: 'too_small', message: 'Too small' }],
      }, { status: 400 })
    ));

    renderWithProviders(<BooksPage />);
    await screen.findByText('Dune');

    await userEvent.click(screen.getByRole('button', { name: /add book/i }));

    expect(await screen.findByText('Too small')).toBeInTheDocument();
  });

  it('should add a book and refresh the list', async () => {
    renderWithProviders(<BooksPage />);
    await screen.findByText('Dune');

    await userEvent.type(screen.getByLabelText(/title/i), 'Neuromancer');
    await userEvent.type(screen.getByLabelText(/author/i), 'Gibson');
    await userEvent.type(screen.getByLabelText(/pages/i), '271');
    await userEvent.click(screen.getByRole('button', { name: /add book/i }));

    await waitFor(() => expect(screen.getByLabelText(/title/i)).toHaveValue(''));
  });
});
