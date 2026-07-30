import type { RowData } from '@tanstack/react-table'
import type { EditablePriceField } from '@/lib/price-cell-navigation'

export {}

declare module '@tanstack/react-table' {
  // TData and TValue are unused here but cannot be renamed or dropped: TypeScript
  // requires every declaration of an interface to repeat its type parameter list
  // identically for the merge to apply.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string
  }

  // One interface is shared by every table in the app, so each member is optional and
  // only the tables that supply it can read it back.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    // Bulk pricing modal: updates a local draft row, no server write.
    updatePriceDraft?: (barcode: string, field: EditablePriceField, value: string) => void
    // Invoice detail table: commits one field to the server on blur.
    savePriceField?: (barcode: string, field: EditablePriceField, value: number) => Promise<void>
  }
}
