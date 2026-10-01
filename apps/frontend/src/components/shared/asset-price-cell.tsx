import { EditableAmountCell } from '@/components/shared/editable-amount-cell'
import {
  editablePriceFieldForColumn,
  EDITABLE_PRICE_COLUMNS,
  type EditablePriceColumnId,
  type PriceCellEditorRegistry,
} from '@/lib/price-cell-navigation'
import type { Row, Table } from '@tanstack/react-table'
import type { AssetSearchRow } from 'shared-types'

const BLANK_ASSET_PRICE = 0

interface AssetPriceCellProps {
  row: Row<AssetSearchRow>
  columnId: EditablePriceColumnId
  label: string
  table: Table<AssetSearchRow>
  editorRegistry: PriceCellEditorRegistry
}

export function AssetPriceCell({
  row,
  columnId,
  label,
  table,
  editorRegistry,
}: AssetPriceCellProps): React.JSX.Element {
  const asset = row.original
  const field = EDITABLE_PRICE_COLUMNS[columnId]

  async function savePrice(value: number | null) {
    const save = table.options.meta?.savePriceField
    // Optional because TableMeta is a single interface shared by every table in the app,
    // so a page that forgets to pass meta would otherwise no-op and look like a success.
    if (!save) throw new Error('savePriceField is missing from the table meta')
    await save(asset.barcode, field, value ?? BLANK_ASSET_PRICE)
  }

  return (
    <EditableAmountCell
      row={row}
      table={table}
      field={field}
      value={asset[columnId] ?? BLANK_ASSET_PRICE}
      blankValue={BLANK_ASSET_PRICE}
      label={`${label} for ${asset.barcode}`}
      editorRegistry={editorRegistry}
      fieldForColumn={editablePriceFieldForColumn}
      onSave={savePrice}
    />
  )
}
