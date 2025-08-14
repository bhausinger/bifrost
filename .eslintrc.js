module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.js', // Ignore JS files in TS projects
    'apps/scraper/**/*', // Ignore Python scraper
  ],
  overrides: [
    // Frontend-specific rules
    {
      files: ['apps/frontend/**/*.{ts,tsx}'],
      env: {
        browser: true,
        es2020: true,
      },
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
      ],
      plugins: ['react-refresh'],
      rules: {
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
        'react/prop-types': 'off',
        'react/display-name': 'off',
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    // Backend-specific rules
    {
      files: ['apps/server/**/*.ts'],
      env: {
        node: true,
        es2022: true,
      },
      rules: {
        'no-console': 'off', // Allow console.log in server
      },
    },
  ],
};