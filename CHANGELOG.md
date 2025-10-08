# Changelog

## 5.2.1 - 2025-09-08

- Upgrade Igo Dust

## 5.2.0 - 2025-09-08

- Parallel service initialization for faster startup
- Language validation now uses Set for O(1) lookup performance
- New `npm run compress` script using @squoosh/cli
- Replaced clean-webpack-plugin with Webpack 5 native `output.clean`
- Removed IE 11 compatibility for smaller/faster bundles
- Updated documentation (Webpack 2 → 5, jshint → eslint)
- **BREAKING**: Plugin system removed (unused feature)
- **BREAKING**: `igo compress` CLI command removed (use `npm run compress`)
- Removed dependencies: sharp, cheerio, pg-hstore, file-loader, url-loader, imagemin, imagemin-cli, clean-webpack-plugin
- Fixed all npm audit vulnerabilities and deprecation warnings

## 5.1.7

- **Important fix**: Fixed lodash forEach vs forOwn usage in Query and Sql classes

## 5.1.6

- Fixed typed columns in joins
- Fixed lodash forEach vs forOwn usage

## 5.1.5

- Rewrite Sql as a class + refactor whereNot
- Fixed joins and filter handling on joined columns

## 5.1.3

- Updated dependencies
- Fixed migration (10s delay)

## 5.1.2

- Fixed nested has_many includes
- Allow nested includes
- Added ORM joins support

## 5.1.1

- Removed babel

## 5.1.0

- Async igo-dust support
- Upgrade igo-dust dependency

## 5.0.11

- Fixed default tailwind project with webpack config

## 5.0.10

- Updated dependencies
- Fixed limit/offset
- Fixed default tailwind project
- Fixed migrations list function

## 5.0.9

- Updated dependencies + minor fixes
- Moved webpack-assets.json file (to avoid webpack restarting)

## 5.0.8

- Fixed Db error handling and logging
- Fixed joins in count queries

## 5.0.7

- Fixed migrations error handling

## 5.0.6

- Fixed migrations error

## 5.0.5

- Fixed migrations lock

## 5.0.4

- Fixed migrations

## 5.0.3

- Fixed async db initialization
- Added req.hasError() method to validator

## 5.0.2

- Fixed CLI: igo db

## 5.0.1

- Fixed Query.count()

## 5.0.0

- **BREAKING**: Removed callback support, async/await only
