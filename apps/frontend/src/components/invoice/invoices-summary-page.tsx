import { INVOICE_COLUMNS_BY_TYPE } from '@/components/invoice/invoice-columns'
import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { ExportAssetsButton } from '@/components/shared/export-assets-button'
import { SearchBar } from '@/components/shared/search-bar'
import {
  toColumnDefs,
  toSummaryCsvColumns,
  visibleSummaryColumns,
} from '@/components/table-columns/summary-column'
import { useCan } from '@/hooks/use-can'
import { useCollectionDateRange, useInvoiceTypeParam } from '@/lib/filters/hooks'
import { preloadInvoiceDetail, useInvoicesList } from '@/hooks/use-invoice'
import { toCsv } from '@/lib/csv'
import { downloadFile } from '@/lib/download-file'
import { waitForNextPaint } from '@/lib/wait-for-next-paint'
import { getSelectedOrNull } from '@/ui-types/select-option-types'
import { ORGANIZATION_HEADER, type InvoiceTypeFilter } from '@/ui-types/invoice-form-types'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { INVOICE_TYPE, type InvoiceSummary } from 'shared-types'

const PINNED_COLUMN_IDS = ['invoice_date', 'invoice_reference']
const CSV_MIME_TYPE = 'text/csv'
const FILENAME_DATE_FORMAT = 'yyyyMMdd'

export function InvoicesSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [invoiceType, setInvoiceType] = useInvoiceTypeParam()
  const searchParams = useOptimisticSearchParams()

  const { data: invoices = [] } = useInvoicesList(fromDate, toDate, invoiceType)

  const canCreate = useCan('create_update_invoice')
  const can = useCan()

  const getRowHref = useCallback(
    (invoice: InvoiceSummary) =>
      collectionDetailHref('invoices', invoice.invoice_number, searchParams),
    [searchParams],
  )
  const visibleColumns = useMemo(
    () => visibleSummaryColumns(INVOICE_COLUMNS_BY_TYPE[invoiceType], can),
    [invoiceType, can],
  )
  const columns = useMemo(
    () => toColumnDefs(visibleColumns, { getHref: getRowHref }),
    [visibleColumns, getRowHref],
  )

  const [exportLoading, setExportLoading] = useState(false)

  async function handleExport() {
    if (invoices.length === 0) return
    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = toCsv(toSummaryCsvColumns(visibleColumns), invoices)
      downloadFile(
        exportFilename(invoiceType, getSelectedOrNull(fromDate), getSelectedOrNull(toDate)),
        new Blob([csv], { type: CSV_MIME_TYPE }),
      )
    } catch {
      toast.error('Failed to export invoices', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <CollectionPage
      title={INVOICE_PAGE_TITLE[invoiceType]}
      columns={columns}
      data={invoices}
      pinLeft={PINNED_COLUMN_IDS}
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
        <div className="flex items-center gap-2">
          <ExportAssetsButton
            loading={exportLoading}
            disabled={invoices.length === 0 || exportLoading}
            onClick={handleExport}
          />
          {canCreate && (
            <Button asChild>
              <Link to="/invoices/new">
                <PlusIcon />
                Create Invoice
              </Link>
            </Button>
          )}
        </div>
      }
    />
  )
}

const INVOICE_EXPORT_NAME = {
  [INVOICE_TYPE.purchase]: 'purchase-invoices',
  [INVOICE_TYPE.sales]: 'sales-invoices',
} as const satisfies Record<InvoiceTypeFilter, string>

function exportFilename(
  invoiceType: InvoiceTypeFilter,
  fromDate: Date | null,
  toDate: Date | null,
): string {
  const name = INVOICE_EXPORT_NAME[invoiceType]
  if (fromDate === null || toDate === null) return `${name}.csv`
  return `${name}-${format(fromDate, FILENAME_DATE_FORMAT)}-${format(toDate, FILENAME_DATE_FORMAT)}.csv`
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
