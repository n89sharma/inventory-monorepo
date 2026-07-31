import js from '@eslint/js'
import globals from 'globals'
import { importX } from 'eslint-plugin-import-x'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/components/shadcn/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, sonarjs.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.json' })],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/incompatible-library': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ConditionalExpression[consequent.type=/^JSX(Element|Fragment)$/][alternate.type=/^JSX(Element|Fragment)$/]',
          message:
            'Do not use a ternary to switch between two rendered components. Extract a named sub-component that early-returns each branch (if/else). `cond ? <A/> : null` is fine.',
        },
        {
          selector:
            'JSXOpeningElement[name.name=/^(DataTable|CollectionPage|CollectionDetailPage|AssetResultsTable)$/] > JSXAttribute[name.name=/^(getRowHref|getRowClassName|getSubRows|getRowId)$/] > JSXExpressionContainer > :matches(ArrowFunctionExpression, FunctionExpression)',
          message:
            'This prop feeds row rendering or the table options, so an inline function breaks DataRow memoization on every render. Hoist it to module scope or useCallback. (onRowMouseEnter is exempt: DataTable holds it in a ref.)',
        },
        {
          selector:
            'CallExpression[callee.name=/^use(Layout)?Effect$/] :matches(CallExpression[callee.name="reset"], CallExpression[callee.property.name="reset"])',
          message:
            'Do not reset a form from an effect. Any object dependency (a prop, an SWR payload) re-fires the effect on an unrelated re-render — a Clerk token refresh alone clears the form. Seed react-hook-form with defaultValues in a component mounted only while the dialog is open, so unmounting does the reset. For a form that must track server data, pass values with resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH.',
        },
      ],
    },
  },
  {
    // Column-def modules export ColumnDef factories whose cell/header renderers
    // can't be split out; they are not Fast Refresh boundaries by nature.
    files: ['src/components/table-columns/**', 'src/components/**/*-table-columns.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // React Compiler skips any component calling useReactTable, because the table
    // instance is created once and mutated in place, so values read off it cannot be
    // memoized safely. TanStack fixes this in v9 by returning a fresh reference per
    // state change, but v9 is still beta (latest is 8.21.3). Scoped to the files that
    // call useReactTable directly so the rule keeps guarding everywhere else.
    files: [
      'src/components/shared/data-table.tsx',
      'src/components/collections/bulk-edit-pricing-modal.tsx',
    ],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
)
