import type { RowData } from '@tanstack/react-table'

export {}

declare module '@tanstack/react-table' {
  // TData and TValue are unused here but cannot be renamed or dropped: TypeScript
  // requires every declaration of an interface to repeat its type parameter list
  // identically for the merge to apply.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string
  }
}
