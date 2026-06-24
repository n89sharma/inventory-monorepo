import js from '@eslint/js'
import globals from 'globals'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'generated'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      sonarjs.configs.recommended,
    ],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
)
