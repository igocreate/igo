import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { aBook } from '@/test/handlers';

import { BooksList } from './books-list';

// Un composant pur n'a besoin d'aucun provider : des props en entrée, du
// balisage en sortie.
describe('BooksList', () => {
  it('affiche chaque livre', () => {
    render(<BooksList books={[aBook(), aBook({ id: 2, title: 'Neuromancer' })]} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Neuromancer')).toBeInTheDocument();
  });

  it("le dit quand il n'y a rien à afficher", () => {
    render(<BooksList books={[]} />);

    expect(screen.getByText(/aucun livre/i)).toBeInTheDocument();
  });
});
