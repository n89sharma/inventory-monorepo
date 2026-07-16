import { PageContent } from '@/components/app-layout/page-content'
import { DataTable } from '@/components/shadcn/data-table'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { useTableSortParam } from '@/hooks/use-table-sort-param'
import type { ColumnDef, Table } from '@tanstack/react-table'

interface CollectionPageProps<TData, TValue> {
  title: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchBar: React.ReactNode
  actions?: React.ReactNode
  onRowMouseEnter?: (row: TData) => void
  getRowHref?: (row: TData) => string
  defaultSort?: { id: string; desc: boolean }
  renderTableFilter?: (table: Table<TData>) => React.ReactNode
}

export function CollectionPage<TData, TValue>({
  title,
  columns,
  data,
  searchBar,
  actions,
  onRowMouseEnter,
  getRowHref,
  defaultSort = { id: 'created_at', desc: true },
  renderTableFilter,
}: CollectionPageProps<TData, TValue>) {
  const [sorting, onSortingChange] = useTableSortParam(defaultSort)
  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {actions}
        </div>
        {searchBar}
      </StickyPageHeader>
      <PageContent className="flex flex-col gap-2">
        <DataTable
          columns={columns}
          data={data}
          onRowMouseEnter={onRowMouseEnter}
          getRowHref={getRowHref}
          defaultSort={defaultSort}
          sorting={sorting}
          onSortingChange={onSortingChange}
          renderTableFilter={renderTableFilter}
        />
      </PageContent>
    </>
  )
}
