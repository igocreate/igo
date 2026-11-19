@README.md

## À vérifier sur toute feature

```bash
grep -r "useQuery\|useMutation" src/components/            # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/ # doit être vide
```

- Tout nouveau fichier dans `pages/` ou `sections/` arrive avec son test.
- Une ressource externe ajoutée (police, CDN, API) s'ajoute à la politique de
  sécurité de contenu dans `vite.config.ts`, sinon la console le refuse.
- Toute règle de surface (obligatoire, format, longueur, cohérence entre champs)
  se valide côté client, par un schéma zod du formulaire. Les règles métier
  restent au serveur : leurs erreurs de champ (`ApiError.fieldError`)
  s'affichent telles quelles, sans être recopiées côté client.
