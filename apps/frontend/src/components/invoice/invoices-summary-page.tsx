import { invoiceTableColumns } from '@/components/invoice/invoice-columns'
import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { SearchBar } from '@/components/shared/search-bar'
import { useCan } from '@/hooks/use-can'
import { useCollectionDateRange, useInvoiceTypeParam } from '@/lib/filters/hooks'
import { preloadInvoiceDetail, useInvoicesList } from '@/hooks/use-invoice'
import { ORGANIZATION_HEADER, type InvoiceTypeFilter } from '@/ui-types/invoice-form-types'
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
  const columns = useMemo(() => {
    const isPurchase = invoiceType === INVOICE_TYPE.purchase
    return invoiceTableColumns(getRowHref, ORGANIZATION_HEADER[invoiceType], isPurchase, isPurchase)
  }, [getRowHref, invoiceType])

  return (
    <CollectionPage
      title={INVOICE_PAGE_TITLE[invoiceType]}
      columns={columns}
      data={invoices}
      onRowMouseEnter={(invoice) => preloadInvoiceDetail(invoice.invoice_number)}
      getRowHref={getRowHref}
      renderTableFilter={(table) => (
        <div className="flex gap-2">
          <ColumnTextFilter
            table={table}
            columnId="invoice_reference"
            placeholder="Reference Invoice Number"
            clearLabel="Clear reference invoice number"
            className="w-64"
          />
          <ColumnTextFilter
            table={table}
            columnId="organization"
            placeholder={`${ORGANIZATION_HEADER[invoiceType]} name`}
            clearLabel={`Clear ${ORGANIZATION_HEADER[invoiceType].toLowerCase()} name`}
            className="w-64"
          />
        </div>
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

const INVOICE_PAGE_TITLE = {
  [INVOICE_TYPE.purchase]: 'Purchase Invoices',
  [INVOICE_TYPE.sales]: 'Sales Invoices',
} as const satisfies Record<InvoiceTypeFilter, string>

const INVOICE_TYPE_TOGGLE_LABEL = {
  [INVOICE_TYPE.purchase]: 'Show Sales',
  [INVOICE_TYPE.sales]: 'Show Purchase',
} as const satisfies Record<InvoiceTypeFilter, string>

function InvoiceTypeToggle({
  value,
  onChange,
}: {
  value: InvoiceTypeFilter
  onChange: (value: InvoiceTypeFilter) => void
}): React.JSX.Element {
  const nextType = value === INVOICE_TYPE.purchase ? INVOICE_TYPE.sales : INVOICE_TYPE.purchase
  return (
    <Button variant="outline" onClick={() => onChange(nextType)}>
      {INVOICE_TYPE_TOGGLE_LABEL[value]}
    </Button>
  )
}
