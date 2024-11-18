module.exports = [{
  'rules': {
    'indent': [
      'error',
      2,
      {
        'ArrayExpression': 'first',
        'CallExpression': {'arguments': 'first'},
        'FunctionDeclaration': {'body': 1, 'parameters': 'first'},
        'MemberExpression': 0,
        'ObjectExpression': 1
      }
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'no-unused-vars': [
      'error',
      { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'keyword-spacing': [
      'error',
      { 'after': true, 'before': true }
    ]
  }
}];