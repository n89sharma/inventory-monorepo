import { invoiceTableColumns } from '@/components/invoice/invoice-columns'
import { Button } from '@/components/shadcn/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { CollectionPage } from '@/components/collections/collection-page'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { SearchBar } from '@/components/shared/search-bar'
import { useCan } from '@/hooks/use-can'
import { useCollectionDateRange, useInvoiceTypeParam } from '@/lib/filters/hooks'
import { preloadInvoiceDetail, useInvoicesList } from '@/hooks/use-invoice'
import type { InvoiceTypeFilter } from '@/ui-types/invoice-form-types'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { INVOICE_TYPE, type InvoiceSummary } from 'shared-types'

export function InvoicesSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [invoiceType, setInvoiceType] = useInvoiceTypeParam()
  const searchParams = useOptimisticSearchParams()

  const { data: invoices = [] } = useInvoicesList(fromDate, toDate, invoiceType)

  const canCreate = useCan('create_update_invoice')

  const getRowHref = useCallback(
    (invoice: InvoiceSummary) =>
      collectionDetailHref('invoices', invoice.invoice_number, searchParams),
    [searchParams],
  )
  const columns = useMemo(() => invoiceTableColumns(getRowHref), [getRowHref])

  return (
    <CollectionPage
      title="Invoices"
      columns={columns}
      data={invoices}
      onRowMouseEnter={(invoice) => preloadInvoiceDetail(invoice.invoice_number)}
      getRowHref={getRowHref}
      renderTableFilter={(table) => (
        <ColumnTextFilter
          table={table}
          columnId="invoice_reference"
          placeholder="Reference Invoice Number"
          clearLabel="Clear reference invoice number"
          className="w-64"
        />
      )}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate }}
          setSearchOptions={{ setFromDate, setToDate }}
        >
          <InvoiceTypeToggle value={invoiceType} onChange={setInvoiceType} />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/invoices/new">
              <PlusIcon />
              Create Invoice
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}

function InvoiceTypeToggle({
  value,
  onChange,
}: {
  value: InvoiceTypeFilter
  onChange: (value: InvoiceTypeFilter) => void
}): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as InvoiceTypeFilter)
      }}
      variant="outline"
    >
      <ToggleGroupItem value={INVOICE_TYPE.purchase}>Purchase</ToggleGroupItem>
      <ToggleGroupItem value={INVOICE_TYPE.sales}>Sales</ToggleGroupItem>
    </ToggleGroup>
  )
}
