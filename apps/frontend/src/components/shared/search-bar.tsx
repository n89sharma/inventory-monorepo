import {
  getCollectionRangeEndMonth,
  getCollectionRangeStartMonth,
  getDefaultFromDate,
  getToday,
} from '@/lib/filters/defaults'
import type { SearchOptions, SetSearchOptions } from '@/ui-types/search-option-types'
import { ANY_OPTION, getSelectedOrNull, getSelectOption } from '@/ui-types/select-option-types'
import React from 'react'
import { DateRangeFilter } from './filters/date-range-filter'
import { FilterRow } from './filter-row'
import { QuickSearchButtons } from './quick-search-buttons'

interface SearchBarProps {
  searchOptions: SearchOptions
  setSearchOptions: SetSearchOptions
  onSearch?: (searchOptions: SearchOptions) => Promise<void>
  rangeLabel?: string
  leadingFilter?: React.ReactNode
  children?: React.ReactNode
}

export function SearchBar({
  searchOptions,
  setSearchOptions,
  onSearch,
  rangeLabel,
  leadingFilter,
  children,
}: SearchBarProps): React.JSX.Element {
  const { fromDate, toDate } = searchOptions
  const {
    setFromDate,
    setToDate,
    setOrigin,
    setDestination,
    setHoldFor,
    setHoldBy,
    setCustomer,
    setVendor,
  } = setSearchOptions

  function handleRangeChange(from: Date, to: Date) {
    setFromDate(getSelectOption(from))
    setToDate(getSelectOption(to))
  }

  async function handleQuickSearch(days: number) {
    const from = getSelectOption(getDefaultFromDate(days))
    const to = getSelectOption(getToday())
    setFromDate(from)
    setToDate(to)

    if (setOrigin) setOrigin(ANY_OPTION)
    if (setDestination) setDestination(ANY_OPTION)
    if (setHoldBy) setHoldBy(ANY_OPTION)
    if (setHoldFor) setHoldFor(ANY_OPTION)
    if (setCustomer) setCustomer(ANY_OPTION)
    if (setVendor) setVendor(ANY_OPTION)

    if (onSearch)
      await onSearch({
        fromDate: from,
        toDate: to,
        origin: ANY_OPTION,
        destination: ANY_OPTION,
        holdBy: ANY_OPTION,
        holdFor: ANY_OPTION,
        customer: ANY_OPTION,
        vendor: ANY_OPTION,
      })
  }

  return (
    <FilterRow>
      <QuickSearchButtons days={[7, 30, 60]} onSearch={handleQuickSearch} />

      {leadingFilter}

      <DateRangeFilter
        id="date-range"
        label={rangeLabel}
        from={getSelectedOrNull(fromDate)}
        to={getSelectedOrNull(toDate)}
        onChange={handleRangeChange}
        startMonth={getCollectionRangeStartMonth()}
        endMonth={getCollectionRangeEndMonth()}
      />

      {children}
    </FilterRow>
  )
}
