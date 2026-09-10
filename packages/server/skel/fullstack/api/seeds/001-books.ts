import Book from '../app/features/books/Book';

// Les seeds donnent de quoi regarder à un dépôt fraîchement cloné. Une donnée
// dont l'application a besoin pour tourner relève d'une migration — ceci ne
// s'exécute qu'hors production, et seulement sur demande.
export default async () => {
  await Book.create({ title: 'Dune', author: 'Frank Herbert', pages: 412 });
  await Book.create({ title: 'Neuromancer', author: 'William Gibson', pages: 271 });
};
