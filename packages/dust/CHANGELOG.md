# Changelog

## [0.6.0] - 2025-11-20

- Helpers can now receive body function as third parameter (enables helpers like `@repeat`)
- Improved whitespace handling: preserves multiple spaces on same line, normalizes newlines, removes whitespace between HTML tags

## [0.5.0] - 2025-10-08

- Performance: Optimized template compilation by using array joins instead of string concatenation
- Performance: Cached AsyncFunction constructor to avoid repeated object prototype lookups
- Performance: Made regex patterns static in Parser to avoid recreation on each parse
- Fixed bug with single quotes in params

## [0.4.1] - 2024-06-30

- Fixed normalized paths handling

## [0.4.0] - 2024-06-30

- **Breaking**: Igo-dust is now fully async - all rendering operations return promises
- Templates are now compiled to async functions
- Exposed `getSource` function to retrieve compiled template source code
- Added documentation on loops

## [0.3.5] - 2023-12-01

- Fixed Config views handling
- Fixed isJsDom check when navigator is undefined

## [0.3.4] - 2023-11-XX

- Refactored API for better consistency

## [0.3.3] - 2023-XX-XX

- Fixed include functionality

## [0.3.2] - 2023-XX-XX

- Fixed params parsing

## [0.3.1] - 2023-XX-XX

- Fixed handling of "=" signs in params

## [0.3.0] - 2023-XX-XX

- Includes with body support
- Additional test coverage

## Earlier Versions

See [git history](https://github.com/igocreate/igo-dust/commits/master) for changes in versions prior to 0.3.0.
