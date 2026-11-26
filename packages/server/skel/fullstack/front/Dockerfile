# syntax=docker/dockerfile:1

# Le build du front, servi par nginx. **Une image pour tous les
# environnements** : le build pose des marqueurs dans index.html, que
# docker-entrypoint.sh remplace au démarrage par les variables du conteneur.
# C'est ce qui rend l'image promouvable sans reconstruction — voir l'ADR
# « Empaquetage de l'application ».
#
# Se construit depuis la racine du dépôt, qui porte le lock du workspace :
#   docker build -f front/Dockerfile -t {project.name}-front .

# Seule déclaration de Node ici, à aligner avec .nvmrc.
ARG NODE_IMAGE=node:24-trixie-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, la couche
# d'installation est réutilisée telle quelle.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY front/package.json front/
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# husky n'a rien à installer hors d'un dépôt git
RUN npm pkg delete scripts.prepare && pnpm install --frozen-lockfile --filter ./front

# Les marqueurs que docker-entrypoint.sh remplacera au démarrage, dans la
# <meta> d'index.html.
#
# Pas de VITE_* : Vite les inline dans les bundles, et il faudrait alors y
# substituer les marqueurs au démarrage. Un `sed` dans un fichier de assets/
# **invalide son hachage** — le nom ne décrit plus le contenu, alors que c'est
# lui qui autorise le cache immuable d'un an. Lue dans index.html, déjà
# revalidé à chaque chargement, la valeur laisse les bundles intacts. Et elle
# ne peut pas être figée par une transformation au build (`Number()`, un
# greffon), puisqu'elle n'existe qu'au runtime.
ENV FARO_URL=__FARO_URL__ \
    FARO_ORIGIN=__FARO_ORIGIN__ \
    FARO_SAMPLE=__FARO_SAMPLE__ \
    ENVIRONMENT=__ENVIRONMENT__

COPY front/ front/
# Le téléversement des source maps n'a lieu que si la clé est fournie, et elle
# ne reste pas dans l'image : un secret de build n'est pas une couche.
RUN --mount=type=secret,id=faro_api_key,env=FARO_API_KEY \
    pnpm --filter ./front build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY front/nginx.conf /etc/nginx/conf.d/default.conf
# L'image nginx exécute ce qu'elle trouve dans /docker-entrypoint.d au
# démarrage, par ordre alphabétique.
COPY --chmod=0755 front/docker-entrypoint.sh /docker-entrypoint.d/90-runtime-config.sh
# `sed -i` écrit un fichier temporaire à côté d'index.html : c'est le
# répertoire qui doit appartenir à nginx, pas seulement les fichiers.
COPY --from=build --chown=nginx:nginx /app/front/dist /usr/share/nginx/html
USER root
RUN chown nginx:nginx /usr/share/nginx/html
USER nginx

# Le SHA du commit voyage avec l'image : ce qui tourne est interrogeable.
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=${GIT_SHA}

# Sans privilèges, l'image ne peut pas lier un port sous 1024.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
