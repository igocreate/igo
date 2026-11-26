# syntax=docker/dockerfile:1

# L'API, compilée puis servie par Node. L'image ne porte aucune valeur
# d'environnement : tout ce qui varie arrive par les variables du conteneur,
# ce qui la rend promouvable d'un environnement à l'autre sans reconstruction
# — voir l'ADR « Empaquetage de l'application ».
#
# Se construit depuis la racine du dépôt, qui porte le lock du workspace :
#   docker build -f api/Dockerfile -t {project.name}-api .

# Seule déclaration de Node ici, à aligner avec .nvmrc.
ARG NODE_IMAGE=node:24-trixie-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, la couche
# d'installation est réutilisée telle quelle.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# husky n'a rien à installer hors d'un dépôt git
RUN npm pkg delete scripts.prepare && pnpm install --frozen-lockfile --filter ./api

COPY api/ api/
RUN pnpm --filter ./api build

# `deploy` rassemble le paquet et ses seules dépendances de production dans un
# dossier autonome, sans les liens vers le store du workspace : c'est lui qu'on
# copie dans l'image finale. Les dépendances de développement n'y entrent pas —
# elles pèsent, et ce qui n'est pas livré n'est pas à tenir à jour.
RUN pnpm --filter ./api deploy --prod /deploy

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production

# `tini` récolte les processus orphelins et relaie SIGTERM au processus
# principal : sans lui, l'arrêt ordonné d'igo ne serait jamais déclenché.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /deploy/node_modules node_modules
COPY --from=build --chown=node:node /deploy/dist         dist

USER node
# Le build émet dans dist/ en conservant l'arborescence, et y recopie sql/ :
# les chemins relatifs de l'application valent donc depuis ce répertoire.
WORKDIR /app/dist

# Le SHA du commit voyage avec l'image : ce qui tourne est interrogeable.
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=${GIT_SHA}

EXPOSE 3000

# La sonde interroge la disponibilité, qui répond 503 dès le début de l'arrêt :
# l'orchestrateur retire l'instance pendant que les requêtes en cours finissent.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "app.js"]
