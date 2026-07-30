import { InvoicePriceCell } from '@/components/invoice/invoice-price-cell'
import type { AssetInvoiceSelector } from '@/components/invoice/invoice-summary-field'
import { Button } from '@/components/shadcn/button'
import { isEditablePriceField } from '@/lib/price-cell-navigation'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  formatDate,
  formatLocation,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import type { AssetCost, AssetSummary } from 'shared-types'
import {
  createIdColumn,
  createSelectColumn,
  MODEL_COLUMN_SIZE,
  SERIAL_NUMBER_COLUMN_SIZE,
  sortableHeader,
} from './column-primitives'

// The columns every detail table opens with, and the anchor the invoice column sits after.
function identityColumns(getHref: (asset: AssetSummary) => string): ColumnDef<AssetSummary>[] {
  return [
    createSelectColumn<AssetSummary>(),
    createIdColumn<AssetSummary>({
      accessorKey: 'barcode',
      header: sortableHeader<AssetSummary>('Barcode'),
      href: getHref,
      value: (row) => row.barcode,
      filterFn: 'includesString',
    }),
    {
      accessorKey: 'serial_number',
      header: sortableHeader<AssetSummary>('Serial Number'),
      filterFn: 'includesString',
      size: SERIAL_NUMBER_COLUMN_SIZE,
    },
    {
      accessorKey: 'model',
      header: sortableHeader<AssetSummary>('Model'),
      filterFn: 'includesString',
      size: MODEL_COLUMN_SIZE,
    },
  ]
}

// Ends on location, the anchor the cost columns sit after.
function specColumns(): ColumnDef<AssetSummary>[] {
  return [
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.brand),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'readiness',
      header: 'Readiness',
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
    },
    {
      accessorKey: 'meter_total',
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: 'Total Meter',
    },
    {
      accessorKey: 'cassettes',
      header: 'Cassettes',
      cell: ({ row }) => row.original.cassettes ?? '',
    },
    {
      accessorKey: 'internal_finisher',
      header: 'Internal Finisher',
      cell: ({ row }) => row.original.internal_finisher ?? '',
    },
    {
      accessorKey: 'accessories',
      header: 'Accessories',
      cell: ({ row }) => row.original.accessories.join(', '),
    },
    {
      id: 'location',
      accessorFn: (row) => formatLocation(row.location, row.is_in_transit),
      header: sortableHeader<AssetSummary>('Location'),
      cell: ({ getValue }) => getValue<string>(),
    },
  ]
}

// Hidden by default (see collection-detail-page columnVisibility); defined so
// the detail tables can default-sort by asset creation date.
const CREATED_AT_COLUMN: ColumnDef<AssetSummary> = {
  accessorKey: 'created_at',
  header: 'Created',
  cell: ({ row }) => formatDate(row.original.created_at),
}

function actionColumns(
  onEdit?: (asset: AssetSummary) => void,
  onDelete?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const columns: ColumnDef<AssetSummary>[] = []
  if (onEdit) {
    columns.push({
      id: 'edit',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Edit asset"
          onClick={() => onEdit(row.original)}
        >
          <PencilSimpleIcon />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }
  if (onDelete) {
    columns.push({
      id: 'delete',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Remove asset"
          onClick={() => onDelete(row.original)}
          disabled={disabledRowId === row.original.id}
        >
          <TrashIcon />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }
  return columns
}

export function createCollectionDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  return [
    ...identityColumns(getHref),
    ...specColumns(),
    CREATED_AT_COLUMN,
    ...actionColumns(onEdit, onDelete, disabledRowId),
  ]
}

function createInvoiceColumn(
  accessorKey: string,
  getInvoiceNumber: AssetInvoiceSelector,
): ColumnDef<AssetSummary> {
  return {
    accessorKey,
    header: 'Invoice',
    cell: ({ row }) => {
      const invoiceNumber = getInvoiceNumber(row.original) ?? null
      if (invoiceNumber === null) return null
      return (
        <Link to={`/invoices/${invoiceNumber}`} className="text-primary hover:underline">
          {invoiceNumber}
        </Link>
      )
    },
  }
}

export function createArrivalDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  return [
    ...identityColumns(getHref),
    createInvoiceColumn('purchase_invoice_number', (a) => a.purchase_invoice_number),
    ...specColumns(),
    CREATED_AT_COLUMN,
    ...actionColumns(onEdit, onDelete, disabledRowId),
  ]
}

export function createDepartureDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  return [
    ...identityColumns(getHref),
    createInvoiceColumn('sales_invoice_number', (a) => a.sales_invoice_number),
    ...specColumns(),
    CREATED_AT_COLUMN,
    ...actionColumns(onEdit, onDelete, disabledRowId),
  ]
}

export const PURCHASE_COST_COLUMNS = [
  ['purchase_cost', 'Purchase Cost'],
  ['transport_cost', 'Transport Cost'],
  ['processing_cost', 'Processing Cost'],
  ['total_cost', 'Total Cost'],
] as const satisfies ReadonlyArray<readonly [keyof AssetCost, string]>

export const SALE_PRICE_COLUMN = ['sale_price', 'Sale Price'] as const satisfies readonly [
  keyof AssetCost,
  string,
]

const EDITABLE_COST_COLUMN_SIZE = 110

function createCostColumn(
  field: keyof AssetCost,
  header: string,
  priceEditEnabled: boolean,
): ColumnDef<AssetSummary> {
  if (priceEditEnabled && isEditablePriceField(field)) {
    return {
      id: field,
      header,
      size: EDITABLE_COST_COLUMN_SIZE,
      cell: ({ row, table }) => (
        <InvoicePriceCell asset={row.original} field={field} label={header} table={table} />
      ),
    }
  }
  return {
    id: field,
    header,
    cell: ({ row }) => formatUSDWithSymbol(row.original.cost?.[field] ?? null),
  }
}

interface CostColumnOptions {
  canViewPurchasePrice: boolean
  canViewSalePrice: boolean
  priceEditEnabled: boolean
}

function costColumns({
  canViewPurchasePrice,
  canViewSalePrice,
  priceEditEnabled,
}: CostColumnOptions): ColumnDef<AssetSummary>[] {
  const columns: ColumnDef<AssetSummary>[] = []
  if (canViewPurchasePrice) {
    columns.push(
      ...PURCHASE_COST_COLUMNS.map(([field, header]) =>
        createCostColumn(field, header, priceEditEnabled),
      ),
    )
  }
  if (canViewSalePrice) {
    columns.push(createCostColumn(SALE_PRICE_COLUMN[0], SALE_PRICE_COLUMN[1], priceEditEnabled))
  }
  return columns
}

interface InvoiceDetailColumnOptions extends CostColumnOptions {
  getHref: (asset: AssetSummary) => string
  onDelete?: (asset: AssetSummary) => void
}

export function createInvoiceDetailColumns(
  options: InvoiceDetailColumnOptions,
): ColumnDef<AssetSummary>[] {
  return [
    ...identityColumns(options.getHref),
    ...specColumns(),
    ...costColumns(options),
    CREATED_AT_COLUMN,
    ...actionColumns(undefined, options.onDelete),
  ]
}
