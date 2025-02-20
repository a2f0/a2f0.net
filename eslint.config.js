import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';
import nodePlugin from 'eslint-plugin-node';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  eslint.configs.recommended,
  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['.next/**/*', '.next/*'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
      'prettier': prettierPlugin,
      'node': nodePlugin,
      'import': importPlugin,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'indent': ['error', 2],
      'import/no-commonjs': 'error',
      'node/no-unpublished-import': 'off',
      'prettier/prettier': 'error',
      'block-scoped-var': 'error',
      'eqeqeq': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eol-last': 'error',
      'prefer-arrow-callback': 'error',
      'no-trailing-spaces': 'error',
      'quotes': ['warn', 'single', { 'avoidEscape': true }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-restricted-properties': [
        'error',
        {
          'object': 'describe',
          'property': 'only'
        },
        {
          'object': 'it',
          'property': 'only'
        }
      ],
      // TypeScript specific rules
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-warning-comments': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/camelcase': 'off',
      'node/no-missing-import': 'off',
      'node/no-empty-function': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-require': 'off',
      'node/shebang': 'off',
      'no-dupe-class-members': 'off',
      'require-atomic-updates': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_|^abstract',
        'ignoreRestSiblings': true,
        'args': 'all',
        'destructuredArrayIgnorePattern': '^_'
      }]
    }
  },
  // Configuration for JavaScript files
  {
    files: ['**/*.js', '**/*.jsx', 'eslint.config.js'],
    ignores: ['.next/**/*', '.next/*'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    plugins: {
      'prettier': prettierPlugin,
      'node': nodePlugin,
      'import': importPlugin,
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'indent': ['error', 2],
      'import/no-commonjs': 'error',
      'node/no-unpublished-import': 'off',
      'prettier/prettier': 'error',
      'block-scoped-var': 'error',
      'eqeqeq': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eol-last': 'error',
      'prefer-arrow-callback': 'error',
      'no-trailing-spaces': 'error',
      'quotes': ['warn', 'single', { 'avoidEscape': true }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error'
    }
  }
];
