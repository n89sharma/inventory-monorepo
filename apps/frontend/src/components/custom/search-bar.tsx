import type { SearchOptions, SetSearchOptions } from '@/ui-types/search-option-types'
import { ANY_OPTION, getSelectOption } from '@/ui-types/select-option-types'
import { subDays } from "date-fns"
import React from 'react'
import { DatePickerFieldInline } from './date-picker'
import { QuickSearchButtons } from './quick-search-buttons'


interface SearchBarProps {
  searchOptions: SearchOptions
  setSearchOptions: SetSearchOptions
  onSearch: (searchOptions: SearchOptions) => Promise<void>
  children?: React.ReactNode
}

export function SearchBar({
  searchOptions,
  setSearchOptions,
  onSearch,
  children }: SearchBarProps): React.JSX.Element {

  const { fromDate, toDate } = searchOptions
  const { setFromDate, setToDate, setOrigin, setDestination, setHoldFor, setHoldBy, setCustomer } = setSearchOptions

  async function handleQuickSearch(days: number) {
    const from = getSelectOption(subDays(new Date(), days))
    const to = getSelectOption(new Date())
    setFromDate(from)
    setToDate(to)

    if (setOrigin) setOrigin(ANY_OPTION)
    if (setDestination) setDestination(ANY_OPTION)
    if (setHoldBy) setHoldBy(ANY_OPTION)
    if (setHoldFor) setHoldFor(ANY_OPTION)
    if (setCustomer) setCustomer(ANY_OPTION)

    await onSearch({
      fromDate: from,
      toDate: to,
      origin: ANY_OPTION,
      destination: ANY_OPTION,
      holdBy: ANY_OPTION,
      holdFor: ANY_OPTION,
      customer: ANY_OPTION
    })
  }

  return (
    <div className="flex flex-row flex-wrap gap-2 items-end">
      <QuickSearchButtons days={[7, 30, 60]} onSearch={handleQuickSearch} />

      <DatePickerFieldInline
        label="From"
        id="from-date"
        date={fromDate}
        setDate={setFromDate}
      />

      <DatePickerFieldInline
        label="To"
        id="to-date"
        date={toDate}
        setDate={setToDate}
      />

      {children}
    </div>
  )
}
