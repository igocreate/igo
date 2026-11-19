import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw-server';

import { AddBookSection } from './add-book-section';

const fillBook = async () => {
  await userEvent.type(screen.getByLabelText(/titre/i), 'Neuromancer');
  await userEvent.type(screen.getByLabelText(/auteur/i), 'Gibson');
  await userEvent.type(screen.getByLabelText(/pages/i), '271');
};

const submit = () => userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

describe('AddBookSection', () => {
  it("refuse une saisie mal formée sans appeler l'API", async () => {
    let requested = false;
    server.use(
      http.post('/api/books', () => {
        requested = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderWithProviders(<AddBookSection />);

    await userEvent.type(screen.getByLabelText(/pages/i), 'beaucoup');
    await submit();

    expect(screen.getByText('Le titre est obligatoire')).toBeInTheDocument();
    expect(screen.getByText("L'auteur est obligatoire")).toBeInTheDocument();
    expect(screen.getByText('Le nombre de pages est un entier positif')).toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toHaveAttribute('aria-invalid', 'true');
    expect(requested).toBe(false);
  });

  it('affiche sous le champ le refus que le serveur lui attribue', async () => {
    server.use(
      http.post('/api/books', () =>
        HttpResponse.json(
          {
            type: 'urn:igo:validation-failed',
            title: 'Validation failed',
            status: 400,
            errors: [{ path: 'title', code: 'taken', message: 'Ce titre existe déjà' }],
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<AddBookSection />);

    await fillBook();
    await submit();

    expect(await screen.findByText('Ce titre existe déjà')).toBeInTheDocument();
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
    renderWithProviders(<AddBookSection />);

    await fillBook();
    await submit();

    const alert = await screen.findByText(/l'ajout a échoué/i);
    expect(alert).toHaveTextContent('0af7651916cd43dd8448eb211c80319c');
  });

  it('vide le formulaire une fois le livre ajouté', async () => {
    renderWithProviders(<AddBookSection />);

    await fillBook();
    await submit();

    await waitFor(() => expect(screen.getByLabelText(/titre/i)).toHaveValue(''));
  });
});
