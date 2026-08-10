import { useCan } from '@/hooks/use-can'
import {
  createPriceCellEditorRegistry,
  type PriceCellEditorRegistry,
} from '@/lib/price-cell-navigation'
import type { TableMeta } from '@tanstack/react-table'
import { useMemo } from 'react'
import type { AssetSearchRow, PatchAssetPricing } from 'shared-types'

interface PriceCellEditing {
  // Absent when the user lacks edit_prices; the cost columns then render read-only text.
  priceEditorRegistry: PriceCellEditorRegistry | undefined
  tableMeta: TableMeta<AssetSearchRow>
}

// `updatePrice` must be stable — pass the entity's mutation wrapped in a useCallback keyed on the
// collection id, otherwise the table meta changes identity on every render.
export function usePriceCellEditing(
  updatePrice: (barcode: string, patch: PatchAssetPricing) => Promise<void>,
): PriceCellEditing {
  const canEditPrice = useCan('edit_prices')
  const registry = useMemo(() => createPriceCellEditorRegistry(), [])

  const tableMeta = useMemo<TableMeta<AssetSearchRow>>(
    () => ({
      savePriceField: (barcode, field, value) => updatePrice(barcode, { [field]: value }),
    }),
    [updatePrice],
  )

  return { priceEditorRegistry: canEditPrice ? registry : undefined, tableMeta }
}
