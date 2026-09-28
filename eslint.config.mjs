// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Convenção de prefixo `_` para valores descartados de propósito
      // (ex.: `const { password: _password, ...rest } = user`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Testes e utilitários de teste: mocks legitimamente usam tipagem solta
    // (`jest.fn()`, retornos `any`, `expect(service.metodo)`), e as regras
    // type-aware acusam falsos positivos clássicos nesse contexto
    // (`unbound-method` em `expect(obj.metodo).toHaveBeenCalled`). Mantidas
    // ligadas no código de aplicação, desligadas aqui.
    files: ['**/*.spec.ts', 'test/**/*.ts', '**/test-utils/**/*.ts'],
    rules: {
      // Specs às vezes guardam referências de módulo para clareza mesmo sem
      // usar em todas as asserções; não vale poluir o lint com isso.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);