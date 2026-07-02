import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatThousandsK } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'

interface BulkEditPricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAssets: AssetSummary[]
  onSaveSuccess: () => void
}

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
  parts_cost: string
  sale_price: string
}

type EditablePriceField =
  | 'purchase_cost'
  | 'transport_cost'
  | 'processing_cost'
  | 'other_cost'
  | 'sale_price'

type TableMeta = {
  updateField: (barcode: string, field: EditablePriceField, value: string) => void
}

function sanitize(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function PriceCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        $
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        inputMode="decimal"
        placeholder="0.00"
        className="h-8 pl-5"
      />
    </div>
  )
}

function makeEditableColumn(field: EditablePriceField, header: string): ColumnDef<PricingRow> {
  return {
    accessorKey: field,
    header,
    cell: ({ row, table }: CellContext<PricingRow, unknown>) => (
      <PriceCell
        value={row.original[field]}
        onChange={(v) =>
          (table.options.meta as TableMeta).updateField(row.original.barcode, field, v)
        }
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

const PRICE_FIELDS: EditablePriceField[] = [
  'purchase_cost',
  'transport_cost',
  'processing_cost',
  'other_cost',
  'sale_price',
]

function checkDirty(rows: PricingRow[], initial: PricingRow[]): boolean {
  return rows.some((row, i) => {
    const init = initial[i]
    if (!init) return false
    return [...PRICE_FIELDS, 'parts_cost' as const].some((f) => row[f] !== init[f])
  })
}

export function BulkEditPricingModal({
  open,
  onOpenChange,
  selectedAssets,
  onSaveSuccess,
}: BulkEditPricingModalProps) {
  const getAssetDetail = useAssetStore((state) => state.getAssetDetail)
  const bulkUpdatePricing = useAssetStore((state) => state.bulkUpdatePricing)
  const [rows, setRows] = useState<PricingRow[]>([])
  const [initialRows, setInitialRows] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedAssetsRef = useRef(selectedAssets)
  selectedAssetsRef.current = selectedAssets

  const guard = useUnsavedChangesGuard(checkDirty(rows, initialRows), onOpenChange)

  useEffect(() => {
    if (!open) return
    const assets = selectedAssetsRef.current
    setLoading(true)
    Promise.allSettled(assets.map((a) => getAssetDetail(a.barcode))).then((results) => {
      const loaded: PricingRow[] = results.map((r, i) => {
        const asset = assets[i]
        if (r.status === 'fulfilled') {
          const { cost } = r.value
          return {
            barcode: asset.barcode,
            serial_number: asset.serial_number,
            brand: asset.brand,
            model: asset.model,
            meter_total: asset.meter_total,
            purchase_cost: cost.purchase_cost?.toString() ?? '',
            transport_cost: cost.transport_cost?.toString() ?? '',
            processing_cost: cost.processing_cost?.toString() ?? '',
            other_cost: cost.other_cost?.toString() ?? '',
            parts_cost: cost.parts_cost?.toString() ?? '',
            sale_price: cost.sale_price?.toString() ?? '',
          }
        }
        return {
          barcode: asset.barcode,
          serial_number: asset.serial_number,
          brand: asset.brand,
          model: asset.model,
          meter_total: asset.meter_total,
          purchase_cost: '',
          transport_cost: '',
          processing_cost: '',
          other_cost: '',
          parts_cost: '',
          sale_price: '',
        }
      })
      setRows(loaded)
      setInitialRows(loaded)
      setLoading(false)
    })
  }, [open, getAssetDetail])

  function updateField(barcode: string, field: EditablePriceField, value: string) {
    setRows((prev) => prev.map((r) => (r.barcode === barcode ? { ...r, [field]: value } : r)))
  }

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { updateField } satisfies TableMeta,
  })

  async function handleSave() {
    setSaving(true)
    try {
      await bulkUpdatePricing(
        rows.map((r) => ({
          barcode: r.barcode,
          purchase_cost: parseFloat(r.purchase_cost) || 0,
          transport_cost: parseFloat(r.transport_cost) || 0,
          processing_cost: parseFloat(r.processing_cost) || 0,
          other_cost: parseFloat(r.other_cost) || 0,
          parts_cost: parseFloat(r.parts_cost) || 0,
          sale_price: parseFloat(r.sale_price) || 0,
        })),
      )
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
      <Dialog open={open} onOpenChange={guard.onOpenChange}>
        <DialogContent className="sm:max-w-[min(90vw,1300px)] max-h-[min(80vh,800px)] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Edit Pricing</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <CircleNotchIcon className="mr-2 animate-spin" />
              Loading pricing…
            </div>
          ) : (
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
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => guard.onOpenChange(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} type="button" disabled={saving || loading}>
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
