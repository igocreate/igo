import { z } from 'zod';

const PAGES_ERROR = 'Le nombre de pages est un entier positif';

// Mêmes règles de surface que le DTO de création de l'API, qui les revérifie :
// le formulaire refuse une saisie mal formée sans aller-retour réseau. Ce que
// seul le serveur sait — une référence déjà prise, une règle métier — n'est pas
// ici : il le refuse, et son message s'affiche sous le champ qu'il nomme.
//
// Les schémas vivent à part des types : `types.ts` décrit ce que l'API rend,
// `schemas.ts` ce que les formulaires acceptent. Les deux divergent dès qu'un
// champ est saisi en texte avant d'être converti.
export const NewBook = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(255, 'Le titre dépasse 255 caractères'),
  author: z.string().min(1, "L'auteur est obligatoire").max(255, "L'auteur dépasse 255 caractères"),
  pages: z.coerce.number({ error: PAGES_ERROR }).int(PAGES_ERROR).positive(PAGES_ERROR),
});
