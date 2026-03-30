import { getInvoices } from "@/data/api/invoice-api"
import { useInvoiceStore } from "@/data/store/invoice-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { SearchBar } from "../custom/search-bar"
import { CollectionPage } from "./collection-page"
import { invoiceTableColumns } from "./column-defs/invoice-columns"
import type { SearchOptions } from "@/ui-types/search-option-types"

export function InvoicesSummaryPage(): React.JSX.Element {
  const invoices = useInvoiceStore(state => state.invoices)
  const setInvoices = useInvoiceStore(state => state.setInvoices)
  const fromDate = useInvoiceStore(state => state.fromDate)
  const toDate = useInvoiceStore(state => state.toDate)
  const setFromDate = useInvoiceStore(state => state.setFromDate)
  const setToDate = useInvoiceStore(state => state.setToDate)
  const hasSearched = useInvoiceStore(state => state.hasSearched)
  const setHasSearched = useInvoiceStore(state => state.setHasSearched)

  async function onSearchSetData({ fromDate, toDate }: SearchOptions) {
    setHasSearched(true)
    setInvoices(await getInvoices(fromDate, toDate))
  }

  useAutoSearch(hasSearched, onSearchSetData, { setFromDate, setToDate })

  return (
    <CollectionPage
      title="Invoices"
      columns={invoiceTableColumns}
      data={invoices}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate }}
          setSearchOptions={{ setFromDate, setToDate }}
          onSearch={onSearchSetData}
        />
      }
    />
  )
}
