import { useInvoiceStore } from "@/data/store/invoice-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { SearchBar } from "../custom/search-bar"
import { Button } from "../shadcn/button"
import { CollectionPage } from "./collection-page"
import { invoiceTableColumns } from "./column-defs/invoice-columns"

export function InvoicesSummaryPage(): React.JSX.Element {
  const invoices = useInvoiceStore(state => state.invoices)
  const getInvoices = useInvoiceStore(state => state.getInvoices)
  const fromDate = useInvoiceStore(state => state.fromDate)
  const toDate = useInvoiceStore(state => state.toDate)
  const setFromDate = useInvoiceStore(state => state.setFromDate)
  const setToDate = useInvoiceStore(state => state.setToDate)
  const hasSearched = useInvoiceStore(state => state.hasSearched)

  async function onInvoiceSearch({ fromDate, toDate }: SearchOptions) {
    await getInvoices(fromDate, toDate)
  }

  useAutoSearch(hasSearched, onInvoiceSearch, { setFromDate, setToDate })

  return (
    <CollectionPage
      title="Invoices"
      columns={invoiceTableColumns}
      data={invoices}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate }}
          setSearchOptions={{ setFromDate, setToDate }}
          onSearch={onInvoiceSearch}
        />
      }
      actions={
        <Button asChild>
          <Link to="/invoices/new"><PlusIcon />Create Invoice</Link>
        </Button>
      }
    />
  )
}
