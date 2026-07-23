import type { AssetInvoiceSelector } from '@/components/invoice/invoice-summary-field'
import { Button } from '@/components/shadcn/button'
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
import { createIdColumn, createSelectColumn, sortableHeader } from './column-primitives'

export function createCollectionDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const columns: ColumnDef<AssetSummary>[] = [
    createSelectColumn<AssetSummary>(),
    createIdColumn<AssetSummary>({
      accessorKey: 'barcode',
      header: sortableHeader<AssetSummary>('Barcode'),
      href: getHref,
      value: (row) => row.barcode,
    }),
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.brand),
    },
    {
      accessorKey: 'model',
      header: sortableHeader<AssetSummary>('Model'),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'serial_number',
      header: sortableHeader<AssetSummary>('Serial Number'),
      filterFn: 'includesString',
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
    // Hidden by default (see collection-detail-page columnVisibility); defined so
    // the detail tables can default-sort by asset creation date.
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ]

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

function createCollectionDetailColumnsWithInvoice(
  invoiceColumn: ColumnDef<AssetSummary>,
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const baseColumns = createCollectionDetailColumns(getHref, onDelete, onEdit, disabledRowId)
  const serialIndex = baseColumns.findIndex(
    (c) => 'accessorKey' in c && c.accessorKey === 'serial_number',
  )
  baseColumns.splice(serialIndex + 1, 0, invoiceColumn)
  return baseColumns
}

export function createArrivalDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const invoiceColumn = createInvoiceColumn(
    'purchase_invoice_number',
    (a) => a.purchase_invoice_number,
  )
  return createCollectionDetailColumnsWithInvoice(
    invoiceColumn,
    getHref,
    onDelete,
    onEdit,
    disabledRowId,
  )
}

export function createDepartureDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const invoiceColumn = createInvoiceColumn('sales_invoice_number', (a) => a.sales_invoice_number)
  return createCollectionDetailColumnsWithInvoice(
    invoiceColumn,
    getHref,
    onDelete,
    onEdit,
    disabledRowId,
  )
}

const PURCHASE_COST_COLUMNS = [
  ['purchase_cost', 'Purchase Cost'],
  ['transport_cost', 'Transport Cost'],
  ['processing_cost', 'Processing Cost'],
  ['total_cost', 'Total Cost'],
] as const satisfies ReadonlyArray<readonly [keyof AssetCost, string]>

function createCostColumn(field: keyof AssetCost, header: string): ColumnDef<AssetSummary> {
  return {
    id: field,
    header,
    cell: ({ row }) => formatUSDWithSymbol(row.original.cost?.[field] ?? null),
  }
}

export function createInvoiceDetailColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete: ((asset: AssetSummary) => void) | undefined,
  canViewPurchasePrice: boolean,
  canViewSalePrice: boolean,
): ColumnDef<AssetSummary>[] {
  const costColumns: ColumnDef<AssetSummary>[] = []
  if (canViewPurchasePrice) {
    costColumns.push(
      ...PURCHASE_COST_COLUMNS.map(([field, header]) => createCostColumn(field, header)),
    )
  }
  if (canViewSalePrice) {
    costColumns.push(createCostColumn('sale_price', 'Sale Price'))
  }
  const baseColumns = createCollectionDetailColumns(getHref, onDelete)
  if (costColumns.length === 0) return baseColumns
  const locationIndex = baseColumns.findIndex((c) => c.id === 'location')
  baseColumns.splice(locationIndex + 1, 0, ...costColumns)
  return baseColumns
}
