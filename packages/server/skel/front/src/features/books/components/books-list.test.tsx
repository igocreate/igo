import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { aBook } from '@/test/handlers';

import { BooksList } from './books-list';

// A pure component needs no providers: props in, markup out.
describe('BooksList', () => {
  it('should list every book', () => {
    render(<BooksList books={[aBook(), aBook({ id: 2, title: 'Neuromancer' })]} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Neuromancer')).toBeInTheDocument();
  });

  it('should say so when there is nothing to show', () => {
    render(<BooksList books={[]} />);

    expect(screen.getByText(/no book yet/i)).toBeInTheDocument();
  });
});
