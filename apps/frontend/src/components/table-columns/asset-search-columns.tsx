import { Button } from '@/components/shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  formatDate,
  formatLocation,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
  formatWeight,
} from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { differenceInCalendarDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { ASSET_STATUS, type AssetSearchRow } from 'shared-types'
import { createIdColumn } from './shared-columns'

const holdDetailHref = (holdNumber: string): string => `/holds/${holdNumber}`

export const stockDays = (createdAt: Date): number =>
  differenceInCalendarDays(new Date(), createdAt)

export const daysHeld = (heldOn: Date | null): number | undefined =>
  heldOn ? differenceInCalendarDays(new Date(), heldOn) : undefined

function SortableHeader({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <Button variant="ghost" onClick={onToggle} className="h-auto whitespace-normal py-1">
      {label}
      <ArrowsDownUpIcon />
    </Button>
  )
}

export function createAssetSearchColumns(
  detailHref: (row: AssetSearchRow) => string,
): ColumnDef<AssetSearchRow>[] {
  return [
    createIdColumn<AssetSearchRow>({
      accessorKey: 'barcode',
      header: 'Barcode',
      href: detailHref,
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
      header: ({ column }) => (
        <SortableHeader
          label="Model"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      size: 100,
    },
    {
      accessorKey: 'asset_type',
      header: 'Asset Type',
      cell: ({ row }) => formatTitleCase(row.original.asset_type),
      size: 100,
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial Number',
      size: 100,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { status, held_by, hold_hold_number } = row.original
        if (status !== ASSET_STATUS.HELD || !held_by || !hold_hold_number) {
          return <StatusBadge status={status} />
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <StatusBadge status={status} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Held by {held_by} ({hold_hold_number})
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 80,
    },
    {
      accessorKey: 'readiness',
      header: ({ column }) => (
        <SortableHeader
          label="Readiness"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
      size: 80,
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => formatLocation(row.original.location),
    },
    {
      accessorKey: 'country_of_origin',
      header: 'Country of Origin',
      cell: ({ row }) => formatTitleCase(row.original.country_of_origin ?? ''),
      size: 100,
    },
    {
      accessorKey: 'specs_meter_total',
      header: ({ column }) => (
        <SortableHeader
          label="Total Meter"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatThousandsK(row.original.specs_meter_total),
      size: 80,
    },
    {
      accessorKey: 'weight',
      header: ({ column }) => (
        <SortableHeader
          label="Weight"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatWeight(row.original.weight),
      size: 80,
    },
    {
      accessorKey: 'size',
      header: ({ column }) => (
        <SortableHeader
          label="Size"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.size,
      size: 70,
    },
    {
      id: 'days_held',
      accessorFn: (row) => daysHeld(row.hold_created_at),
      header: ({ column }) => (
        <SortableHeader
          label="Days Held"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => daysHeld(row.original.hold_created_at) ?? '',
      sortUndefined: 'last',
      size: 80,
    },
    {
      accessorKey: 'specs_cassettes',
      header: ({ column }) => (
        <SortableHeader
          label="Cassettes"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_cassettes ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_internal_finisher',
      header: ({ column }) => (
        <SortableHeader
          label="Internal Finisher"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_internal_finisher ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_c',
      header: ({ column }) => (
        <SortableHeader
          label="Toner Life C"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_toner_life_c ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_m',
      header: ({ column }) => (
        <SortableHeader
          label="Toner Life M"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_toner_life_m ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_y',
      header: ({ column }) => (
        <SortableHeader
          label="Toner Life Y"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_toner_life_y ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_k',
      header: ({ column }) => (
        <SortableHeader
          label="Toner Life K"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.specs_toner_life_k ?? '',
      size: 80,
    },
    {
      accessorKey: 'cost_purchase_cost',
      header: ({ column }) => (
        <SortableHeader
          label="Purchase Cost"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_purchase_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_transport_cost',
      header: ({ column }) => (
        <SortableHeader
          label="Transport Cost"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_transport_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_processing_cost',
      header: ({ column }) => (
        <SortableHeader
          label="Processing Cost"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_processing_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_total_cost',
      header: ({ column }) => (
        <SortableHeader
          label="Total Cost"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_total_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_sale_price',
      header: ({ column }) => (
        <SortableHeader
          label="Sale Price"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_sale_price),
      size: 90,
    },
    {
      accessorKey: 'hold_hold_number',
      header: 'Hold #',
      cell: ({ row }) => {
        const { hold_hold_number } = row.original
        if (!hold_hold_number) return ''
        return (
          <Link
            to={holdDetailHref(hold_hold_number)}
            className="font-mono text-foreground hover:underline"
          >
            {hold_hold_number}
          </Link>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'held_by',
      header: ({ column }) => (
        <SortableHeader
          label="Held By"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.held_by ?? '',
      size: 120,
    },
    {
      accessorKey: 'hold_created_for',
      header: ({ column }) => (
        <SortableHeader
          label="Held For"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => row.original.hold_created_for ?? '',
      size: 120,
    },
    {
      accessorKey: 'hold_customer',
      header: ({ column }) => (
        <SortableHeader
          label="Hold Customer"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatTitleCase(row.original.hold_customer ?? ''),
      size: 120,
    },
    {
      accessorKey: 'hold_created_at',
      header: ({ column }) => (
        <SortableHeader
          label="Hold Created"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.hold_created_at),
      size: 100,
    },
    {
      accessorKey: 'vendor',
      header: ({ column }) => (
        <SortableHeader
          label="Vendor"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatTitleCase(row.original.vendor ?? ''),
      size: 120,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <SortableHeader
          label="Created"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
      size: 100,
    },
    {
      accessorKey: 'arrival_created_at',
      header: ({ column }) => (
        <SortableHeader
          label="Arrived At"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.arrival_created_at),
      size: 100,
    },
    {
      id: 'stock_days',
      accessorFn: (row) => stockDays(row.created_at),
      header: ({ column }) => (
        <SortableHeader
          label="Stock Days"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => stockDays(row.original.created_at),
      size: 80,
    },
    {
      accessorKey: 'customer',
      header: ({ column }) => (
        <SortableHeader
          label="Customer"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
      size: 120,
    },
    {
      accessorKey: 'departed_at',
      header: ({ column }) => (
        <SortableHeader
          label="Departed At"
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.departed_at),
      size: 100,
    },
    {
      accessorKey: 'purchase_invoice_invoice_number',
      header: 'Invoice #',
      cell: ({ row }) => row.original.purchase_invoice_invoice_number ?? '',
      size: 100,
    },
    {
      id: 'latest_comment',
      header: 'Last Comment',
      cell: ({ row }) => {
        const { latest_comment } = row.original
        if (!latest_comment) return ''
        return (
          <div className="text-left text-xs">
            <div className="whitespace-pre-wrap">{latest_comment}</div>
          </div>
        )
      },
      size: 220,
    },
  ]
}
