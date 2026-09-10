import { getDefaultFromDate, getToday } from '@/lib/filters/defaults'
import type { SearchOptions, SetSearchOptions } from '@/ui-types/search-option-types'
import { ANY_OPTION, getSelectOption } from '@/ui-types/select-option-types'
import React from 'react'
import { DatePickerFieldInline } from './date-picker'
import { QuickSearchButtons } from './quick-search-buttons'

interface SearchBarProps {
  searchOptions: SearchOptions
  setSearchOptions: SetSearchOptions
  onSearch?: (searchOptions: SearchOptions) => Promise<void>
  fromLabel?: string
  toLabel?: string
  leadingFilter?: React.ReactNode
  children?: React.ReactNode
}

const DEFAULT_FROM_LABEL = 'From'
const DEFAULT_TO_LABEL = 'To'

export function SearchBar({
  searchOptions,
  setSearchOptions,
  onSearch,
  fromLabel = DEFAULT_FROM_LABEL,
  toLabel = DEFAULT_TO_LABEL,
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
    <div className="flex flex-row flex-wrap gap-2 items-end">
      <QuickSearchButtons days={[7, 30, 60]} onSearch={handleQuickSearch} />

      {leadingFilter}

      <DatePickerFieldInline
        label={fromLabel}
        id="from-date"
        date={fromDate}
        setDate={setFromDate}
      />

      <DatePickerFieldInline label={toLabel} id="to-date" date={toDate} setDate={setToDate} />

      {children}
    </div>
  )
}
