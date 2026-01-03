import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import hooksPlugin from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import { fixupPluginRules } from '@eslint/compat'

export default tseslint.config(
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'routeTree.gen.ts',
      '.output/**',
      'dist/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      import: fixupPluginRules(importPlugin),
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      'react/display-name': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Prefer arrow functions (const fn = () => {}) over function declarations
      'func-style': ['error', 'expression'],

      // Forbid explicit return types - let TypeScript infer them
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration[returnType]',
          message:
            'Do not use explicit return types. Let TypeScript infer them.',
        },
        {
          selector: 'ArrowFunctionExpression[returnType]',
          message:
            'Do not use explicit return types. Let TypeScript infer them.',
        },
        {
          selector: 'FunctionExpression[returnType]',
          message:
            'Do not use explicit return types. Let TypeScript infer them.',
        },
        {
          selector:
            "CallExpression[callee.name='t'][arguments.0.type!='Literal'][arguments.0.type!='TemplateLiteral']",
          message:
            'The t() function must be called with a string literal to support static analysis. For dynamic keys, use the td() helper instead.',
        },
      ],

      // Import rules - disabled no-unresolved temporarily due to resolver issues
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Enforce literal strings for i18n
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='t'][arguments.0.type!='Literal'][arguments.0.type!='TemplateLiteral']",
          message:
            'The t() function must be called with a string literal to support static analysis. For dynamic keys, use the td() helper instead.',
        },
      ],
    },
  },
  prettierConfig,
)
