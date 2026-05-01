import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Enforce no `any` — use `unknown` + narrowing instead
      '@typescript-eslint/no-explicit-any': 'error',

      // Allow unused vars prefixed with _ (intentional ignores)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // No console.log in production code (use proper error handling)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Catch common mistakes
      'no-duplicate-imports': 'error',
      'no-template-curly-in-string': 'warn',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Relax rules for test files
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Ignore generated and build files
    ignores: [
      'node_modules/',
      'dist/',
      '.turbo/',
      'apps/dashboard/src/types/supabase.ts',
      'apps/scraper/',
      'supabase/functions/',
    ],
  },
)
