import { SearchBar } from '@/components/shared/search-bar'
import { getDefaultFromDate, getToday } from '@/lib/filters/defaults'
import { ANY_OPTION, getSelectOption } from '@/ui-types/select-option-types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const FROM = new Date(2026, 2, 2)
const TO = new Date(2026, 2, 20)

function renderSearchBar() {
  const setters = {
    setFromDate: vi.fn(),
    setToDate: vi.fn(),
    setOrigin: vi.fn(),
  }
  render(
    <SearchBar
      searchOptions={{ fromDate: getSelectOption(FROM), toDate: getSelectOption(TO) }}
      setSearchOptions={setters}
    />,
  )
  return setters
}

describe('SearchBar', () => {
  it('sets both dates when a range is picked', () => {
    const { setFromDate, setToDate } = renderSearchBar()
    fireEvent.click(screen.getByRole('button', { name: /Mar 0?2, 2026/ }))
    fireEvent.click(screen.getByRole('button', { name: /March 10th, 2026/ }))
    fireEvent.click(screen.getByRole('button', { name: /March 16th, 2026/ }))
    expect(setFromDate).toHaveBeenCalledWith(getSelectOption(new Date(2026, 2, 10)))
    expect(setToDate).toHaveBeenCalledWith(getSelectOption(new Date(2026, 2, 16)))
  })

  it('sets the range and resets the other filters from a quick button', () => {
    const { setFromDate, setToDate, setOrigin } = renderSearchBar()
    fireEvent.click(screen.getByRole('button', { name: '30d' }))
    expect(setFromDate).toHaveBeenCalledWith(getSelectOption(getDefaultFromDate(30)))
    expect(setToDate).toHaveBeenCalledWith(getSelectOption(getToday()))
    expect(setOrigin).toHaveBeenCalledWith(ANY_OPTION)
  })
})
