// The skeletons ship their own lint-staged config: without an explicit config
// here, lint-staged would pick theirs up for files under skel/ and try to run
// a linter igo does not have.
module.exports = {
  'packages/*/index.js': 'eslint',
  'packages/*/src/**/*.js': 'eslint',
  'packages/*/test/**/*.js': 'eslint',
  'packages/*/cli/**/*.js': 'eslint',
};
