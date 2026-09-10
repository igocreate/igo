@README.md

## Avant de livrer

`pnpm test` exige MySQL et Valkey (`docker compose up -d` à la racine) ; la base
de test est recréée à chaque exécution.

## À vérifier sur toute feature

- Chaque handler qui lit `body`, `query` ou `params` porte son schéma
  (`handler.body = dto.X`) ; igo liste au démarrage les routes à corps sans
  schéma.
- Chaque contrôleur a son test dans `test/features/<domaine>/` : nominal, 400,
  404, et 401 ou 403 si la route est protégée.
- Un contrôleur renvoie `dto.serialize(...)`, jamais le modèle.
