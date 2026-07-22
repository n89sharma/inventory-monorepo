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
import type { ColumnDef } from '@tanstack/react-table'
import { differenceInCalendarDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { ASSET_STATUS, type AssetSearchRow } from 'shared-types'
import { createIdColumn, sortableHeader } from './shared-columns'

const holdDetailHref = (holdNumber: string): string => `/holds/${holdNumber}`

export const stockDays = (createdAt: Date): number =>
  differenceInCalendarDays(new Date(), createdAt)

export const daysHeld = (heldOn: Date | null): number | undefined =>
  heldOn ? differenceInCalendarDays(new Date(), heldOn) : undefined

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
      header: sortableHeader<AssetSearchRow>('Model'),
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
      header: sortableHeader<AssetSearchRow>('Readiness'),
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
      size: 80,
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => formatLocation(row.original.location, row.original.is_in_transit),
    },
    {
      accessorKey: 'country_of_origin',
      header: 'Country of Origin',
      cell: ({ row }) => formatTitleCase(row.original.country_of_origin ?? ''),
      size: 100,
    },
    {
      accessorKey: 'specs_meter_total',
      header: sortableHeader<AssetSearchRow>('Total Meter'),
      cell: ({ row }) => formatThousandsK(row.original.specs_meter_total),
      size: 80,
    },
    {
      accessorKey: 'weight',
      header: sortableHeader<AssetSearchRow>('Weight'),
      cell: ({ row }) => formatWeight(row.original.weight),
      size: 80,
    },
    {
      accessorKey: 'size',
      header: sortableHeader<AssetSearchRow>('Size'),
      cell: ({ row }) => row.original.size,
      size: 70,
    },
    {
      id: 'days_held',
      accessorFn: (row) => daysHeld(row.hold_created_at),
      header: sortableHeader<AssetSearchRow>('Days Held'),
      cell: ({ row }) => daysHeld(row.original.hold_created_at) ?? '',
      sortUndefined: 'last',
      size: 80,
    },
    {
      accessorKey: 'specs_cassettes',
      header: sortableHeader<AssetSearchRow>('Cassettes'),
      cell: ({ row }) => row.original.specs_cassettes ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_internal_finisher',
      header: sortableHeader<AssetSearchRow>('Internal Finisher'),
      cell: ({ row }) => row.original.specs_internal_finisher ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_c',
      header: sortableHeader<AssetSearchRow>('Toner Life C'),
      cell: ({ row }) => row.original.specs_toner_life_c ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_m',
      header: sortableHeader<AssetSearchRow>('Toner Life M'),
      cell: ({ row }) => row.original.specs_toner_life_m ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_y',
      header: sortableHeader<AssetSearchRow>('Toner Life Y'),
      cell: ({ row }) => row.original.specs_toner_life_y ?? '',
      size: 80,
    },
    {
      accessorKey: 'specs_toner_life_k',
      header: sortableHeader<AssetSearchRow>('Toner Life K'),
      cell: ({ row }) => row.original.specs_toner_life_k ?? '',
      size: 80,
    },
    {
      accessorKey: 'cost_purchase_cost',
      header: sortableHeader<AssetSearchRow>('Purchase Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_purchase_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_transport_cost',
      header: sortableHeader<AssetSearchRow>('Transport Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_transport_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_processing_cost',
      header: sortableHeader<AssetSearchRow>('Processing Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_processing_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_total_cost',
      header: sortableHeader<AssetSearchRow>('Total Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_total_cost),
      size: 90,
    },
    {
      accessorKey: 'cost_sale_price',
      header: sortableHeader<AssetSearchRow>('Sale Price'),
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
      header: sortableHeader<AssetSearchRow>('Held By'),
      cell: ({ row }) => row.original.held_by ?? '',
      size: 120,
    },
    {
      accessorKey: 'hold_created_for',
      header: sortableHeader<AssetSearchRow>('Held For'),
      cell: ({ row }) => row.original.hold_created_for ?? '',
      size: 120,
    },
    {
      accessorKey: 'hold_customer',
      header: sortableHeader<AssetSearchRow>('Hold Customer'),
      cell: ({ row }) => formatTitleCase(row.original.hold_customer ?? ''),
      size: 120,
    },
    {
      accessorKey: 'hold_created_at',
      header: sortableHeader<AssetSearchRow>('Hold Created'),
      cell: ({ row }) => formatDate(row.original.hold_created_at),
      size: 100,
    },
    {
      accessorKey: 'vendor',
      header: sortableHeader<AssetSearchRow>('Vendor'),
      cell: ({ row }) => formatTitleCase(row.original.vendor ?? ''),
      size: 120,
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader<AssetSearchRow>('Created'),
      cell: ({ row }) => formatDate(row.original.created_at),
      size: 100,
    },
    {
      accessorKey: 'arrival_created_at',
      header: sortableHeader<AssetSearchRow>('Arrived At'),
      cell: ({ row }) => formatDate(row.original.arrival_created_at),
      size: 100,
    },
    {
      id: 'stock_days',
      accessorFn: (row) => stockDays(row.created_at),
      header: sortableHeader<AssetSearchRow>('Stock Days'),
      cell: ({ row }) => stockDays(row.original.created_at),
      size: 80,
    },
    {
      accessorKey: 'customer',
      header: sortableHeader<AssetSearchRow>('Customer'),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
      size: 120,
    },
    {
      accessorKey: 'departed_at',
      header: sortableHeader<AssetSearchRow>('Departed At'),
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
