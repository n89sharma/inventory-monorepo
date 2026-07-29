import type { CsvColumn } from '@/lib/csv'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { Permission } from 'shared-types'
import { sortableHeader } from './column-primitives'

export type SummaryColumn<TRow, TContext> = {
  id: string
  label: string
  csvHeader?: string
  text: (row: TRow) => string
  cell?: (row: TRow, context: TContext) => ReactNode
  permission?: Permission
  size?: number
  sortable?: boolean
  filterFn?: ColumnDef<TRow>['filterFn']
}

export function visibleSummaryColumns<TRow, TContext>(
  columns: readonly SummaryColumn<TRow, TContext>[],
  can: (permission: Permission) => boolean,
): SummaryColumn<TRow, TContext>[] {
  return columns.filter((column) => !column.permission || can(column.permission))
}

export function toColumnDefs<TRow, TContext>(
  columns: readonly SummaryColumn<TRow, TContext>[],
  context: TContext,
): ColumnDef<TRow>[] {
  return columns.map((column) => ({
    accessorKey: column.id,
    header: column.sortable ? sortableHeader<TRow>(column.label) : column.label,
    enableSorting: column.sortable ?? false,
    size: column.size,
    filterFn: column.filterFn,
    cell: ({ row }) =>
      column.cell ? column.cell(row.original, context) : column.text(row.original),
  }))
}

export function toSummaryCsvColumns<TRow, TContext>(
  columns: readonly SummaryColumn<TRow, TContext>[],
): CsvColumn<TRow>[] {
  return columns.map((column) => ({
    header: column.csvHeader ?? column.label,
    value: column.text,
  }))
}
