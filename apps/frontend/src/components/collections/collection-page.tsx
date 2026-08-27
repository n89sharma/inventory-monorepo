import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { DataGrid } from '@/components/shared/data-table'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { useTableSortParam } from '@/hooks/use-table-sort-param'
import type { ColumnDef, Table } from '@tanstack/react-table'

const TABLE_LABEL = 'Collections'

interface CollectionPageProps<TData, TValue> {
  title: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchBar: React.ReactNode
  summaryStrip?: React.ReactNode
  actions?: React.ReactNode
  onRowMouseEnter?: (row: TData) => void
  getRowHref?: (row: TData) => string
  defaultSort?: { id: string; desc: boolean }
  pinLeft?: string[]
  renderTableFilter?: (table: Table<TData>) => React.ReactNode
}

export function CollectionPage<TData, TValue>({
  title,
  columns,
  data,
  searchBar,
  summaryStrip,
  actions,
  onRowMouseEnter,
  getRowHref,
  defaultSort = { id: 'created_at', desc: true },
  pinLeft,
  renderTableFilter,
}: CollectionPageProps<TData, TValue>) {
  const [sorting, onSortingChange] = useTableSortParam(defaultSort)
  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {actions}
        </div>
        {searchBar}
      </GridPageHeader>
      {summaryStrip && <PageSection>{summaryStrip}</PageSection>}
      <DataGrid
        label={TABLE_LABEL}
        columns={columns}
        data={data}
        onRowMouseEnter={onRowMouseEnter}
        getRowHref={getRowHref}
        defaultSort={defaultSort}
        pinLeft={pinLeft}
        sorting={sorting}
        onSortingChange={onSortingChange}
        renderTableFilter={renderTableFilter}
      />
    </GridPageContent>
  )
}
