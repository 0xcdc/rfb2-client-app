module.exports = {
  'env': {
    'es2021': true,
    'node': true,
  },
  'extends': [
    'google',
    'eslint:recommended',
    'preact',
  ],
  'parserOptions': {
    'ecmaVersion': 12,
    'sourceType': 'module',
  },
  'plugins': [
    'react-hooks',
  ],
  'rules': {
    "comma-dangle": ["error", {
      "objects": "only-multiline",
      "functions": "only-multiline",
      "imports": "only-multiline",
      "arrays": "only-multiline",
    }],
    "max-len": ["error", {"code": 120}],
    "require-jsdoc": "off",
    "object-curly-spacing": ["error", "always"],
    "indent": ["error", 2, {
      "CallExpression": {"arguments": 1},
      "SwitchCase": 1,
    }],
    "arrow-parens": ["error", "as-needed"],
    "prefer-destructuring": "error",
    "sort-imports": "error",
    "no-use-before-define": "error",
  },
};
