import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  {
    // Global ignores at root level
    ignores: ['.next/**/*', 'dist/**/*'],
  },
  eslint.configs.recommended,
  // Base configuration for all files
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        JSX: 'readonly',
      },
    },
  },
  // Configuration for JavaScript files
  {
    files: ['**/*.js', '**/*.jsx', 'eslint.config.js'],
    plugins: {
      prettier: prettierPlugin,
      node: nodePlugin,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      indent: ['error', 2],
      'import/no-commonjs': 'error',
      'node/no-unpublished-import': 'off',
      'prettier/prettier': 'error',
      'block-scoped-var': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eol-last': 'error',
      'prefer-arrow-callback': 'error',
      'no-trailing-spaces': 'error',
      quotes: ['warn', 'single', {avoidEscape: true}],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
      node: nodePlugin,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      indent: ['error', 2],
      'import/no-commonjs': 'error',
      'node/no-unpublished-import': 'off',
      'prettier/prettier': 'error',
      'block-scoped-var': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eol-last': 'error',
      'prefer-arrow-callback': 'error',
      'no-trailing-spaces': 'error',
      quotes: ['warn', 'single', {avoidEscape: true}],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'describe',
          property: 'only',
        },
        {
          object: 'it',
          property: 'only',
        },
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^abstract',
          ignoreRestSiblings: true,
          args: 'all',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  // Configuration for test files
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**/*',
      '**/test/**/*.ts',
      '**/test/**/*.tsx',
      'test/**/*.ts',
    ],
    languageOptions: {
      globals: {
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
  },
  // WebdriverIO specific files
  {
    files: [
      '**/wdio.*.conf.ts',
      '**/test/pageobjects/**/*.ts',
      '**/test/specs/**/*.ts',
    ],
    languageOptions: {
      globals: {
        // WebdriverIO globals
        browser: 'readonly',
        $: 'readonly',
        $$: 'readonly',
        WebdriverIO: 'readonly',
      },
    },
  },
];
