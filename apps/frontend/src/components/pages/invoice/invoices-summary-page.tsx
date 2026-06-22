import { SearchBar } from "@/components/custom/search-bar"
import { CollectionPage } from "@/components/pages/collection-page"
import { invoiceTableColumns } from "@/components/pages/column-defs/invoice-columns"
import { Button } from "@/components/shadcn/button"
import { Field, FieldLabel } from "@/components/shadcn/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group"
import { useInvoiceStore, type InvoiceTypeFilter } from "@/data/store/invoice-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { useCan } from "@/hooks/use-can"
import { preloadInvoiceDetail, useInvoicesList } from "@/hooks/use-invoice"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { INVOICE_TYPE } from "shared-types"
import { Link } from "react-router-dom"


export function InvoicesSummaryPage(): React.JSX.Element {
  const fromDate = useInvoiceStore(state => state.fromDate)
  const toDate = useInvoiceStore(state => state.toDate)
  const invoiceType = useInvoiceStore(state => state.invoiceType)
  const setFromDate = useInvoiceStore(state => state.setFromDate)
  const setToDate = useInvoiceStore(state => state.setToDate)
  const setInvoiceType = useInvoiceStore(state => state.setInvoiceType)
  const hasSearched = useInvoiceStore(state => state.hasSearched)
  const setHasSearched = useInvoiceStore(state => state.setHasSearched)

  const { data: invoices = [] } = useInvoicesList(fromDate, toDate)
  const visibleInvoices = invoices.filter(invoice => invoice.invoice_type === invoiceType)

  async function onInvoiceSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onInvoiceSearch, { setFromDate, setToDate })

  const canCreate = useCan('create_update_invoice')

  return (
    <CollectionPage
      title="Invoices"
      columns={invoiceTableColumns}
      data={visibleInvoices}
      onRowMouseEnter={(invoice) => preloadInvoiceDetail(invoice.invoice_number)}
      getRowHref={(invoice) => `/invoices/${invoice.invoice_number}`}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate }}
          setSearchOptions={{ setFromDate, setToDate }}
          onSearch={onInvoiceSearch}
        >
          <InvoiceTypeFilterField value={invoiceType} onChange={setInvoiceType} />
        </SearchBar>
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

function InvoiceTypeFilterField(
  { value, onChange }: { value: InvoiceTypeFilter; onChange: (value: InvoiceTypeFilter) => void }
): React.JSX.Element {
  return (
    <Field className="w-fit">
      <FieldLabel>Type</FieldLabel>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={next => { if (next) onChange(next as InvoiceTypeFilter) }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value={INVOICE_TYPE.purchase}>Purchase</ToggleGroupItem>
        <ToggleGroupItem value={INVOICE_TYPE.sales}>Sales</ToggleGroupItem>
      </ToggleGroup>
    </Field>
  )
}
