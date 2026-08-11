import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'
import { PriceInput } from '@/components/shared/price-input'
import { EDITABLE_PRICE_FIELDS, type EditablePriceField } from '@/lib/price-cell-navigation'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useAssetPricing, type AssetPricing } from '@/hooks/use-asset-detail'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatThousandsK } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import type { CellContext, ColumnDef, Table } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import type { AssetCost, AssetSummary, BulkUpdateAssetPricing } from 'shared-types'
import { toast } from 'sonner'

const EMPTY_PRICING: AssetPricing = Object.freeze({})

interface BulkEditPricingModalProps {
  onOpenChange: (open: boolean) => void
  selectedAssets: AssetSummary[]
  onSaveSuccess: () => void
}

type BulkPricingItem = BulkUpdateAssetPricing['items'][number]

type PriceDraft = Partial<Record<EditablePriceField, string>>
type PriceDrafts = Record<string, PriceDraft>

type PricingRow = {
  barcode: string
  serial_number: string
  brand: string
  model: string
  meter_total: number | null
  purchase_cost: string
  transport_cost: string
  processing_cost: string
  other_cost: string
  sale_price: string
}

function makeEditableColumn(field: EditablePriceField, header: string): ColumnDef<PricingRow> {
  return {
    accessorKey: field,
    header,
    cell: ({ row, table }: CellContext<PricingRow, unknown>) => (
      <PriceInput
        value={row.original[field]}
        onChange={(value) =>
          table.options.meta?.updatePriceDraft?.(row.original.barcode, field, value)
        }
        label={`${header} for ${row.original.barcode}`}
      />
    ),
    size: 100,
  }
}

const columns: ColumnDef<PricingRow>[] = [
  {
    accessorKey: 'brand',
    header: () => <div className="text-center">Brand</div>,
    cell: ({ getValue }) => (
      <div className="text-center text-muted-foreground">{getValue() as string}</div>
    ),
    size: 90,
  },
  {
    accessorKey: 'model',
    header: () => <div className="text-center">Model</div>,
    cell: ({ getValue }) => <div className="text-center ">{getValue() as string}</div>,
    size: 90,
  },
  {
    accessorKey: 'barcode',
    header: () => <div className="text-center">Barcode</div>,
    cell: ({ getValue }) => <div className="text-center font-mono">{getValue() as string}</div>,
    size: 120,
  },
  {
    accessorKey: 'serial_number',
    header: () => <div className="text-center">Serial #</div>,
    cell: ({ getValue }) => <div className="text-center font-mono">{getValue() as string}</div>,
    size: 120,
  },
  {
    id: 'meter',
    header: () => <div className="text-center">Meter</div>,
    cell: ({ row }) => (
      <div className="text-center">{formatThousandsK(row.original.meter_total)}</div>
    ),
    size: 80,
  },
  makeEditableColumn('purchase_cost', 'Purchase Cost'),
  makeEditableColumn('transport_cost', 'Transport Cost'),
  makeEditableColumn('processing_cost', 'Processing Cost'),
  makeEditableColumn('other_cost', 'Other Cost'),
  makeEditableColumn('sale_price', 'Sale Price'),
]

function toAmount(text: string): number {
  return parseFloat(text) || 0
}

// Only the fields the user actually typed are sent, so an untouched field keeps whatever
// the server already holds and a failed pricing read cannot overwrite anything.
function toBulkPricingItem(barcode: string, draft: PriceDraft): BulkPricingItem {
  const item: BulkPricingItem = { barcode }
  for (const field of EDITABLE_PRICE_FIELDS) {
    const typed = draft[field]
    if (typed !== undefined) item[field] = toAmount(typed)
  }
  return item
}

function toBulkPricingItems(drafts: PriceDrafts): BulkPricingItem[] {
  return Object.entries(drafts)
    .map(([barcode, draft]) => toBulkPricingItem(barcode, draft))
    .filter((item) => EDITABLE_PRICE_FIELDS.some((field) => item[field] !== undefined))
}

function serverText(cost: AssetCost | undefined, field: EditablePriceField): string {
  return cost?.[field]?.toString() ?? ''
}

function cellText(
  cost: AssetCost | undefined,
  draft: PriceDraft | undefined,
  field: EditablePriceField,
): string {
  return draft?.[field] ?? serverText(cost, field)
}

function buildRows(
  assets: AssetSummary[],
  pricing: AssetPricing,
  drafts: PriceDrafts,
): PricingRow[] {
  return assets.map((asset) => {
    const cost = pricing[asset.barcode]
    const draft = drafts[asset.barcode]
    return {
      barcode: asset.barcode,
      serial_number: asset.serial_number,
      brand: asset.brand,
      model: asset.model,
      meter_total: asset.meter_total,
      purchase_cost: cellText(cost, draft, 'purchase_cost'),
      transport_cost: cellText(cost, draft, 'transport_cost'),
      processing_cost: cellText(cost, draft, 'processing_cost'),
      other_cost: cellText(cost, draft, 'other_cost'),
      sale_price: cellText(cost, draft, 'sale_price'),
    }
  })
}

function hasEdits(pricing: AssetPricing, drafts: PriceDrafts): boolean {
  return Object.entries(drafts).some(([barcode, draft]) =>
    EDITABLE_PRICE_FIELDS.some((field) => {
      const edited = draft[field]
      return edited !== undefined && edited !== serverText(pricing[barcode], field)
    }),
  )
}

function PricingEditBody({ loading, table }: { loading: boolean; table: Table<PricingRow> }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <CircleNotchIcon className="mr-2 animate-spin" />
        Loading pricing…
      </div>
    )
  }
  return (
    <div className="overflow-auto min-h-0 flex-1 rounded-md border">
      <table className="w-full caption-bottom text-sm table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="sticky top-0 bg-background z-10"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                  className={cell.column.id === 'model' ? 'whitespace-normal' : ''}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  )
}

export function BulkEditPricingModal({
  onOpenChange,
  selectedAssets,
  onSaveSuccess,
}: BulkEditPricingModalProps) {
  const bulkUpdatePricing = useAssetStore((state) => state.bulkUpdatePricing)
  const [drafts, setDrafts] = useState<PriceDrafts>({})
  const [saving, setSaving] = useState(false)

  const { data: pricing = EMPTY_PRICING, isLoading } = useAssetPricing(
    selectedAssets.map((asset) => asset.barcode),
  )

  const guard = useUnsavedChangesGuard(hasEdits(pricing, drafts), onOpenChange)

  const rows = useMemo(
    () => buildRows(selectedAssets, pricing, drafts),
    [selectedAssets, pricing, drafts],
  )

  function updatePriceDraft(barcode: string, field: EditablePriceField, value: string) {
    setDrafts((prev) => ({ ...prev, [barcode]: { ...prev[barcode], [field]: value } }))
  }

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { updatePriceDraft },
  })

  const items = toBulkPricingItems(drafts)

  async function handleSave() {
    if (items.length === 0) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      await bulkUpdatePricing(items)
      toast.success('Pricing updated.', { position: 'top-center' })
      onOpenChange(false)
      onSaveSuccess()
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <>
      <Dialog open onOpenChange={guard.onOpenChange}>
        <DialogContent className="sm:max-w-[min(90vw,1300px)] max-h-[min(80vh,800px)] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Edit Pricing</DialogTitle>
          </DialogHeader>

          <PricingEditBody loading={isLoading} table={table} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => guard.onOpenChange(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} type="button" disabled={saving || isLoading}>
              {saving ? (
                <>
                  <CircleNotchIcon className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.discard}
      />
    </>
  )
}
