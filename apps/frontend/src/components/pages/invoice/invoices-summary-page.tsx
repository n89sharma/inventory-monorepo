import { SearchBar } from "@/components/custom/search-bar"
import { CollectionPage } from "@/components/pages/collection-page"
import { invoiceTableColumns } from "@/components/pages/column-defs/invoice-columns"
import { Button } from "@/components/shadcn/button"
import { useInvoiceStore } from "@/data/store/invoice-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { useCan } from "@/hooks/use-can"
import { useInvoicesList } from "@/hooks/use-invoices-list"
import { preloadInvoiceDetail } from "@/hooks/use-invoice-detail"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { Link } from "react-router-dom"


export function InvoicesSummaryPage(): React.JSX.Element {
  const fromDate = useInvoiceStore(state => state.fromDate)
  const toDate = useInvoiceStore(state => state.toDate)
  const setFromDate = useInvoiceStore(state => state.setFromDate)
  const setToDate = useInvoiceStore(state => state.setToDate)
  const hasSearched = useInvoiceStore(state => state.hasSearched)
  const setHasSearched = useInvoiceStore(state => state.setHasSearched)

  const { data: invoices = [] } = useInvoicesList(fromDate, toDate)

  async function onInvoiceSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onInvoiceSearch, { setFromDate, setToDate })

  const canCreate = useCan('create_update_invoice')

  return (
    <CollectionPage
      title="Invoices"
      columns={invoiceTableColumns}
      data={invoices}
      onRowMouseEnter={(invoice) => preloadInvoiceDetail(invoice.invoice_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate }}
          setSearchOptions={{ setFromDate, setToDate }}
          onSearch={onInvoiceSearch}
        />
      }
      actions={canCreate ? (
        <Button asChild>
          <Link to="/invoices/new"><PlusIcon />Create Invoice</Link>
        </Button>
      ) : undefined
      }
    />
  )
}
