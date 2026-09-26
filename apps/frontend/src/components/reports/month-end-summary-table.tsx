import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { TABLE_HEAD_CLASS } from '@/components/shared/data-table'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { MonthEndCostRow, MonthEndSummaryTable as SummaryTable } from 'shared-types'

const EMPTY_CELL = '—'
const NUMERIC_CELL_CLASS = 'tabular-nums'
const COST_COLUMN_LABELS = ['Base Cost', 'Freight Cost', 'Base + Freight', 'Total Cost'] as const

function CostCells({ row }: { row: MonthEndCostRow }): React.JSX.Element {
  return (
    <>
      <TableCell className={NUMERIC_CELL_CLASS}>{formatUSDWithSymbol(row.base)}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{formatUSDWithSymbol(row.freight)}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{formatUSDWithSymbol(row.base_freight)}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{formatUSDWithSymbol(row.total)}</TableCell>
    </>
  )
}

function CostRow({ label, row }: { label: string; row: MonthEndCostRow }): React.JSX.Element {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <CostCells row={row} />
    </TableRow>
  )
}

function PartsRow({ value }: { value: number }): React.JSX.Element {
  return (
    <TableRow>
      <TableCell>Parts</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{EMPTY_CELL}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{EMPTY_CELL}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{EMPTY_CELL}</TableCell>
      <TableCell className={NUMERIC_CELL_CLASS}>{formatUSDWithSymbol(value)}</TableCell>
    </TableRow>
  )
}

export function MonthEndSummaryTable({
  title,
  table,
}: {
  title: string
  table: SummaryTable
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="w-fit rounded-md border [&_td]:px-4 [&_td]:text-center [&_th]:px-4 [&_th]:text-center">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_HEAD_CLASS} />
              {COST_COLUMN_LABELS.map((label) => (
                <TableHead key={label} className={TABLE_HEAD_CLASS}>
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <CostRow label="Equipment on-hand" row={table.on_hand} />
            <CostRow label="Stock in transit" row={table.in_transit} />
            {table.parts_value === null ? null : <PartsRow value={table.parts_value} />}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <CostCells row={table.total} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  )
}
