import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', '**/coverage/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // Servicios esbozados: reciben parámetros que aún no usan (sin lógica de negocio).
    files: ['apps/api/src/**/*.service.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: ['db/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } },
  },
  {
    files: ['**/pages/**/*.vue', '**/app.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  prettier,
);
