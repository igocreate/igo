@README.md

## À vérifier sur toute feature

```bash
grep -r "useQuery\|useMutation" src/components/            # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/ # doit être vide
```

- Tout nouveau fichier dans `pages/` ou `sections/` arrive avec son test.
- Une ressource externe ajoutée (police, CDN, API) s'ajoute à la politique de
  sécurité de contenu dans `vite.config.ts`, sinon la console le refuse.
- Un formulaire à valider s'écrit avec React Hook Form, son schéma zod dans le
  `schemas.ts` de sa feature, ses champs pris dans `components/form/`.
- Toute règle de surface (obligatoire, format, longueur, cohérence entre champs)
  se valide côté client, par ce schéma. Les règles métier restent au serveur :
  ses erreurs de champ se posent avec `applyFieldErrors`, sans être recopiées
  côté client.
