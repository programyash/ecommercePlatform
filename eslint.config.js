import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.impeccable', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // Route tables, providers, dev pages and design-system primitives export
    // variants, helpers and types alongside their components by design.
    files: ['src/app/**/*.{ts,tsx}', 'src/**/routes.tsx', 'src/**/*.config.ts', 'src/components/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Portal boundaries (see CONTRACTS.md): screens read data through @/data only,
  // never reach into another portal, and never import a chart library directly.
  ...['customer', 'seller', 'admin'].map((portal) => ({
    files: [`src/portals/${portal}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data/seed', '@/data/seed/*', '@/data/generate', '@/data/generate/*', '@/data/db', '@/data/view', '@/data/actions', '@/data/hooks', '@/data/selectors', '@/data/selectors/*'],
              message: 'Import from @/data (its public entry) instead.',
            },
            {
              group: ['recharts', 'recharts/*'],
              message: 'Use the wrappers in @/components/charts.',
            },
            ...['customer', 'seller', 'admin']
              .filter((other) => other !== portal)
              .map((other) => ({
                group: [`@/portals/${other}`, `@/portals/${other}/*`],
                message: 'Portals must not import from each other; move shared code to @/components.',
              })),
          ],
        },
      ],
    },
  })),
])
