import React from 'react'
import { subDays } from "date-fns"
import { Button } from "@/components/shadcn/button"
import { DatePickerField } from './date-picker'
import { Field, FieldGroup, FieldLabel } from "@/components/shadcn/field"
import { QuickSearchButtons } from './quick-search-buttons'
import { ANY_OPTION, getSelectOption, isSelected, type SelectOption } from 'shared-types'
import type { SearchOptions, SetSearchOptions } from 'shared-types'

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

  const { fromDate, toDate, origin, destination, holdFor, holdBy } = searchOptions
  const { setFromDate, setToDate, setOrigin, setDestination, setHoldFor, setHoldBy } = setSearchOptions

  async function handleSearch() {
    if (!isSelected(fromDate)) return
    const toDateOrDefault: SelectOption<Date> = isSelected(toDate) ? toDate : getSelectOption(new Date())
    setToDate(toDateOrDefault)
    await onSearch({ fromDate, toDate: toDateOrDefault, origin, destination, holdBy, holdFor })
  }

  async function handleQuickSearch(days: number) {
    const from = getSelectOption(subDays(new Date(), days))
    const to = getSelectOption(new Date())
    setFromDate(from)
    setToDate(to)

    if (setOrigin) setOrigin(ANY_OPTION)
    if (setDestination) setDestination(ANY_OPTION)
    if (setHoldBy) setHoldBy(ANY_OPTION)
    if (setHoldFor) setHoldFor(ANY_OPTION)

    await onSearch({
      fromDate: from,
      toDate: to,
      origin: ANY_OPTION,
      destination: ANY_OPTION,
      holdBy: ANY_OPTION,
      holdFor: ANY_OPTION
    })
  }

  return (
    <FieldGroup className="flex flex-col gap-2 border rounded-md p-2">
      <Field>
        <FieldLabel>Quick Search</FieldLabel>
        <QuickSearchButtons days={[7, 30, 60]} onSearch={handleQuickSearch} />
      </Field>

      <div className="flex flex-row gap-2 items-end">
        <DatePickerField
          label="From Date"
          id="from-date"
          date={fromDate}
          setDate={setFromDate}
          className="max-w-40"
        />

        <DatePickerField
          label="To Date"
          id="to-date"
          date={toDate}
          setDate={setToDate}
          className="max-w-40"
        />

        {children}

        <Button
          variant="secondary"
          className="rounded-md"
          onClick={handleSearch}
        >
          Search
        </Button>
      </div>
    </FieldGroup>
  )
}
