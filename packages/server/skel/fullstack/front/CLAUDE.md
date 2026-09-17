@README.md

## À vérifier sur toute feature

```bash
grep -r "useQuery\|useMutation" src/components/            # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/ # doit être vide
```

- Tout nouveau fichier dans `pages/` ou `sections/` arrive avec son test.
- Une ressource externe ajoutée (police, CDN, API) s'ajoute à la politique de
  sécurité de contenu dans `vite.config.ts`, sinon la console le refuse.
- Les erreurs de champ viennent du serveur (`ApiError.fieldError`) ; ne pas les
  redériver côté client.
