import { StatusBadge } from "@/components/custom/status-badge"
import { ReadinessIcon } from "@/components/custom/readiness-icon"
import { CopyButton } from "@/components/custom/copy-button"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { formatLocation, formatThousandsK } from "@/lib/formatters"
import { isCollection, type NavigationSection } from '@/ui-types/navigation-context'
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { AssetSummary } from 'shared-types'

export function createAssetSummaryColumns(
  navigationSection: NavigationSection,
  collectionId?: string,
  onDelete?: (asset: AssetSummary) => void,
  onEdit?: (asset: AssetSummary) => void,
  disabledRowId?: number | null): ColumnDef<AssetSummary>[] {

  const columns: ColumnDef<AssetSummary>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "barcode",
      header: "Barcode",
      cell: ({ row }) => (
        <div className="group flex items-center justify-center gap-2">
          <Link
            to={
              isCollection(navigationSection)
                ? `/${navigationSection}/${collectionId}/${row.original.barcode}`
                : `/search/${row.original.barcode}`
            }
            className="text-primary hover:underline font-medium"
          >
            {row.getValue('barcode')}
          </Link>
          <CopyButton value={row.original.barcode} />
        </div>
      ),
      size: 160
    },
    {
      accessorKey: "brand",
      header: "Brand",
      size: 80
    },
    {
      accessorKey: "model",
      header: "Model",
      size: 120
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
      size: 100
    },
    {
      accessorKey: "meter_total",
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: "Total Meter",
      size: 70
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
      id: "location",
      header: "Location",
      cell: ({ row }) => formatLocation(row.original.location),
      size: 140
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
