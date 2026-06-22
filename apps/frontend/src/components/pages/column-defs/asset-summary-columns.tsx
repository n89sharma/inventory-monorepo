import { ReadinessIcon } from "@/components/custom/readiness-icon"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/shadcn/button"
import { formatLocation, formatThousandsK, formatTitleCase } from "@/lib/formatters"
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import type { AssetInvoiceSelector } from "@/components/custom/cards/invoice-summary-field"
import {
  selectPurchaseInvoiceNumber,
  selectSalesInvoiceNumber
} from "@/components/custom/cards/invoice-summary-field"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { AssetSummary } from 'shared-types'
import { createIdColumn, createSelectColumn } from './shared-columns'

export function createAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null): ColumnDef<AssetSummary>[] {

  const columns: ColumnDef<AssetSummary>[] = [
    createSelectColumn<AssetSummary>(),
    createIdColumn<AssetSummary>({
      accessorKey: "barcode",
      header: "Barcode",
      href: getHref,
      value: row => row.barcode,
    }),
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => formatTitleCase(row.original.brand),
      size: 80
    },
    {
      accessorKey: "model",
      header: "Model",
      size: 100
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
      size: 100
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 80
    },
    {
      accessorKey: "readiness",
      header: "Readiness",
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
      size: 80
    },
    {
      accessorKey: "meter_total",
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: "Total Meter",
      size: 80
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => formatLocation(row.original.location)
    }
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
      enableHiding: false
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
      enableHiding: false
    })
  }

  return columns
}

function createInvoiceColumn(
  accessorKey: string,
  getInvoiceNumber: AssetInvoiceSelector): ColumnDef<AssetSummary> {

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
    size: 70
  }
}

function createAssetSummaryColumnsWithInvoice(
  invoiceColumn: ColumnDef<AssetSummary>,
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null): ColumnDef<AssetSummary>[] {

  const baseColumns = createAssetSummaryColumns(getHref, onDelete, onEdit, disabledRowId)
  const serialIndex = baseColumns.findIndex(c => 'accessorKey' in c && c.accessorKey === 'serial_number')
  baseColumns.splice(serialIndex + 1, 0, invoiceColumn)
  return baseColumns
}

export function createArrivalAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null): ColumnDef<AssetSummary>[] {

  const invoiceColumn = createInvoiceColumn('purchase_invoice_number', selectPurchaseInvoiceNumber)
  return createAssetSummaryColumnsWithInvoice(invoiceColumn, getHref, onDelete, onEdit, disabledRowId)
}

export function createDepartureAssetSummaryColumns(
  getHref: (asset: AssetSummary) => string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null): ColumnDef<AssetSummary>[] {

  const invoiceColumn = createInvoiceColumn('sales_invoice_number', selectSalesInvoiceNumber)
  return createAssetSummaryColumnsWithInvoice(invoiceColumn, getHref, onDelete, onEdit, disabledRowId)
}
