import type { AssetInvoiceSelector } from '@/components/invoice/invoice-summary-field'
import { Button } from '@/components/shadcn/button'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatLocation, formatThousandsK, formatTitleCase } from '@/lib/formatters'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { createIdColumn, createSelectColumn } from './shared-columns'

export function createAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const columns: ColumnDef<AssetSummary>[] = [
    createSelectColumn<AssetSummary>(),
    createIdColumn<AssetSummary>({
      accessorKey: 'barcode',
      header: 'Barcode',
      href: getHref,
      value: (row) => row.barcode,
    }),
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.brand),
      size: 80,
    },
    {
      accessorKey: 'model',
      header: 'Model',
      filterFn: 'equals',
      size: 100,
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial Number',
      filterFn: 'includesString',
      size: 100,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 80,
    },
    {
      accessorKey: 'readiness',
      header: 'Readiness',
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
      size: 80,
    },
    {
      accessorKey: 'meter_total',
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: 'Total Meter',
      size: 80,
    },
    {
      accessorKey: 'cassettes',
      header: 'Cassettes',
      cell: ({ row }) => row.original.cassettes ?? '',
      size: 70,
    },
    {
      accessorKey: 'internal_finisher',
      header: 'Internal Finisher',
      cell: ({ row }) => row.original.internal_finisher ?? '',
      size: 90,
    },
    {
      accessorKey: 'accessories',
      header: 'Accessories',
      cell: ({ row }) => row.original.accessories.join(', '),
      size: 140,
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => formatLocation(row.original.location),
    },
    // Hidden by default (see collection-detail-page columnVisibility); defined so
    // the detail tables can default-sort by asset creation date.
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.created_at),
      size: 100,
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
      size: 50,
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
      size: 50,
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
    size: 70,
  }
}

function createAssetSummaryColumnsWithInvoice(
  invoiceColumn: ColumnDef<AssetSummary>,
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const baseColumns = createAssetSummaryColumns(getHref, onDelete, onEdit, disabledRowId)
  const serialIndex = baseColumns.findIndex(
    (c) => 'accessorKey' in c && c.accessorKey === 'serial_number',
  )
  baseColumns.splice(serialIndex + 1, 0, invoiceColumn)
  return baseColumns
}

export function createArrivalAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const invoiceColumn = createInvoiceColumn(
    'purchase_invoice_number',
    (a) => a.purchase_invoice_number,
  )
  return createAssetSummaryColumnsWithInvoice(
    invoiceColumn,
    getHref,
    onDelete,
    onEdit,
    disabledRowId,
  )
}

export function createDepartureAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null,
): ColumnDef<AssetSummary>[] {
  const invoiceColumn = createInvoiceColumn('sales_invoice_number', (a) => a.sales_invoice_number)
  return createAssetSummaryColumnsWithInvoice(
    invoiceColumn,
    getHref,
    onDelete,
    onEdit,
    disabledRowId,
  )
}
