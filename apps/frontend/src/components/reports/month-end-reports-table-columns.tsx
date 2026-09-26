import { Badge } from '@/components/shadcn/badge'
import { createSelectColumn, IdLink } from '@/components/table-columns/column-primitives'
import { formatDateWithTime, formatMonthYear, formatUSDWithSymbol } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import {
  MONTH_END_REPORT_KIND,
  type MonthEndReportHeader,
  type MonthEndReportKind,
  type MonthEndReportListItem,
} from 'shared-types'

const FIRST_OF_MONTH_SUFFIX = '-01'

const KIND_LABELS = {
  SCHEDULED: 'Scheduled',
  MANUAL: 'Manual',
} as const satisfies Record<MonthEndReportKind, string>

export function monthEndReportTitle(header: MonthEndReportHeader): string {
  if (header.kind === MONTH_END_REPORT_KIND.SCHEDULED && header.period !== null) {
    const periodStart = parseISO(header.period + FIRST_OF_MONTH_SUFFIX)
    return `Month End ${formatMonthYear(periodStart)}`
  }
  return `Month End Snapshot ${formatDateWithTime(header.captured_at)}`
}

export const monthEndReportHref = (id: number): string => `/reports/month-end/${id}`

export const MONTH_END_REPORT_COLUMNS: ColumnDef<MonthEndReportListItem>[] = [
  createSelectColumn<MonthEndReportListItem>(),
  {
    id: 'title',
    header: 'Report',
    accessorFn: (row) => monthEndReportTitle(row),
    cell: ({ row }) => (
      <IdLink to={monthEndReportHref(row.original.id)}>{monthEndReportTitle(row.original)}</IdLink>
    ),
  },
  {
    id: 'kind',
    header: 'Type',
    accessorKey: 'kind',
    cell: ({ row }) => <Badge variant="outline">{KIND_LABELS[row.original.kind]}</Badge>,
  },
  {
    id: 'captured_at',
    header: 'Captured',
    accessorKey: 'captured_at',
    cell: ({ row }) => formatDateWithTime(row.original.captured_at),
  },
  {
    id: 'created_by',
    header: 'Created By',
    accessorFn: (row) => row.created_by ?? '',
  },
  {
    id: 'total_cost',
    header: 'Total Value',
    accessorKey: 'total_cost',
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatUSDWithSymbol(row.original.total_cost)}</div>
    ),
  },
]
