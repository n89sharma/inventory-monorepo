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
import { createIdColumn, sortableHeader } from './column-primitives'

const holdDetailHref = (holdNumber: string): string => `/holds/${holdNumber}`

export const stockDays = (createdAt: Date): number =>
  differenceInCalendarDays(new Date(), createdAt)

export const daysHeld = (heldOn: Date | null): number | undefined =>
  heldOn ? differenceInCalendarDays(new Date(), heldOn) : undefined

export function createSearchPageColumns(
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
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial Number',
      size: 150,
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
    },
    {
      accessorKey: 'readiness',
      header: sortableHeader<AssetSearchRow>('Readiness'),
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
    },
    {
      id: 'location',
      accessorFn: (row) => formatLocation(row.location, row.is_in_transit),
      header: sortableHeader<AssetSearchRow>('Location'),
      cell: ({ getValue }) => getValue<string>(),
    },
    {
      accessorKey: 'country_of_origin',
      header: 'Country of Origin',
      cell: ({ row }) => formatTitleCase(row.original.country_of_origin ?? ''),
    },
    {
      accessorKey: 'specs_meter_total',
      header: sortableHeader<AssetSearchRow>('Total Meter'),
      cell: ({ row }) => formatThousandsK(row.original.specs_meter_total),
    },
    {
      accessorKey: 'weight',
      header: sortableHeader<AssetSearchRow>('Weight'),
      cell: ({ row }) => formatWeight(row.original.weight),
    },
    {
      accessorKey: 'size',
      header: sortableHeader<AssetSearchRow>('Size'),
      cell: ({ row }) => row.original.size,
    },
    {
      id: 'days_held',
      accessorFn: (row) => daysHeld(row.hold_created_at),
      header: sortableHeader<AssetSearchRow>('Days Held'),
      cell: ({ row }) => daysHeld(row.original.hold_created_at) ?? '',
      sortUndefined: 'last',
    },
    {
      accessorKey: 'specs_cassettes',
      header: sortableHeader<AssetSearchRow>('Cassettes'),
      cell: ({ row }) => row.original.specs_cassettes ?? '',
    },
    {
      accessorKey: 'specs_internal_finisher',
      header: sortableHeader<AssetSearchRow>('Internal Finisher'),
      cell: ({ row }) => row.original.specs_internal_finisher ?? '',
    },
    {
      accessorKey: 'accessories',
      header: 'Accessories',
      cell: ({ row }) => row.original.accessories.join(', '),
    },
    {
      accessorKey: 'specs_toner_life_c',
      header: sortableHeader<AssetSearchRow>('Toner Life C'),
      cell: ({ row }) => row.original.specs_toner_life_c ?? '',
    },
    {
      accessorKey: 'specs_toner_life_m',
      header: sortableHeader<AssetSearchRow>('Toner Life M'),
      cell: ({ row }) => row.original.specs_toner_life_m ?? '',
    },
    {
      accessorKey: 'specs_toner_life_y',
      header: sortableHeader<AssetSearchRow>('Toner Life Y'),
      cell: ({ row }) => row.original.specs_toner_life_y ?? '',
    },
    {
      accessorKey: 'specs_toner_life_k',
      header: sortableHeader<AssetSearchRow>('Toner Life K'),
      cell: ({ row }) => row.original.specs_toner_life_k ?? '',
    },
    {
      accessorKey: 'cost_purchase_cost',
      header: sortableHeader<AssetSearchRow>('Purchase Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_purchase_cost),
    },
    {
      accessorKey: 'cost_transport_cost',
      header: sortableHeader<AssetSearchRow>('Transport Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_transport_cost),
    },
    {
      accessorKey: 'cost_processing_cost',
      header: sortableHeader<AssetSearchRow>('Processing Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_processing_cost),
    },
    {
      accessorKey: 'cost_total_cost',
      header: sortableHeader<AssetSearchRow>('Total Cost'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_total_cost),
    },
    {
      accessorKey: 'cost_sale_price',
      header: sortableHeader<AssetSearchRow>('Sale Price'),
      cell: ({ row }) => formatUSDWithSymbol(row.original.cost_sale_price),
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
    },
    {
      accessorKey: 'held_by',
      header: sortableHeader<AssetSearchRow>('Held By'),
      cell: ({ row }) => row.original.held_by ?? '',
    },
    {
      accessorKey: 'hold_created_for',
      header: sortableHeader<AssetSearchRow>('Held For'),
      cell: ({ row }) => row.original.hold_created_for ?? '',
    },
    {
      accessorKey: 'hold_customer',
      header: sortableHeader<AssetSearchRow>('Hold Customer'),
      cell: ({ row }) => formatTitleCase(row.original.hold_customer ?? ''),
    },
    {
      accessorKey: 'hold_created_at',
      header: sortableHeader<AssetSearchRow>('Hold Created'),
      cell: ({ row }) => formatDate(row.original.hold_created_at),
    },
    {
      accessorKey: 'vendor',
      header: sortableHeader<AssetSearchRow>('Vendor'),
      cell: ({ row }) => formatTitleCase(row.original.vendor ?? ''),
    },
    {
      accessorKey: 'created_at',
      header: sortableHeader<AssetSearchRow>('Created'),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: 'arrival_created_at',
      header: sortableHeader<AssetSearchRow>('Arrived At'),
      cell: ({ row }) => formatDate(row.original.arrival_created_at),
    },
    {
      id: 'stock_days',
      accessorFn: (row) => stockDays(row.created_at),
      header: sortableHeader<AssetSearchRow>('Stock Days'),
      cell: ({ row }) => stockDays(row.original.created_at),
    },
    {
      accessorKey: 'customer',
      header: sortableHeader<AssetSearchRow>('Customer'),
      cell: ({ row }) => formatTitleCase(row.original.customer ?? ''),
    },
    {
      accessorKey: 'departed_at',
      header: sortableHeader<AssetSearchRow>('Departed At'),
      cell: ({ row }) => formatDate(row.original.departed_at),
    },
    {
      accessorKey: 'purchase_invoice_invoice_number',
      header: 'Invoice #',
      cell: ({ row }) => row.original.purchase_invoice_invoice_number ?? '',
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
    },
  ]
}
