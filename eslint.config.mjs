import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * monorepo全体を1つのFlat Configで扱う。
 * 型情報を使う検査（Promiseの取り扱い等）を有効にするため projectService を利用する。
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'apps/api/prisma/migrations/**',
    ],
  },

  // 設定ファイル等のJavaScript。型情報は使わない。
  {
    files: ['**/*.{js,mjs,cjs}'],
    ignores: ['tests/load/**'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // k6スクリプト。Node.jsではなくk6ランタイムで実行されるため、専用のグローバルを定義する。
  {
    files: ['tests/load/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        console: 'readonly',
      },
    },
  },

  // TypeScript共通
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 未使用引数は _ 始まりで明示する（Repositoryのシグネチャ合わせ等で発生する）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // NestJS
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Seedはビルド対象のtsconfigに含まれないため、型情報を使う検査から除外する。
  {
    files: ['apps/api/prisma/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // テストダブルは実装を持たないためawaitを含まないasyncメソッドが正当に発生する。
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      globals: { ...globals.jest },
    },
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Next.js
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.flat['recommended-latest'].rules,
      // App Routerのみを使用しており、pagesディレクトリを前提とするこの検査は対象外。
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
);
