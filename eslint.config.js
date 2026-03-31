const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      'indent': ['error', 2, {
        'ArrayExpression': 'first',
        'CallExpression': { 'arguments': 'first' },
        'FunctionDeclaration': { 'body': 1, 'parameters': 'first' },
        'MemberExpression': 0,
        'ObjectExpression': 1,
      }],
      'linebreak-style': ['error', 'unix'],
      'no-unused-vars': ['error', {
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': false,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'destructuredArrayIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
      }],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
    },
  },
];
