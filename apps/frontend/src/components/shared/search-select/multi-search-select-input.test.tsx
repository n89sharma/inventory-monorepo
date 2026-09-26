import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MultiSearchSelectInput } from './multi-search-select-input'

type Item = { id: number; name: string }

const ITEMS: Item[] = [
  { id: 1, name: 'IRADX4725I' },
  { id: 2, name: 'IRADX4735I' },
  { id: 3, name: 'IRADX4835I' },
]
const PLACEHOLDER = 'Model'
const TWO_ITEM_MAX = 2

function Harness({ maxSelection = ITEMS.length }: { maxSelection?: number }): React.JSX.Element {
  const [selection, setSelection] = useState<Item[]>([])
  const [query, setQuery] = useState('')
  return (
    <>
      <MultiSearchSelectInput
        selection={selection}
        query={query}
        onSelectionChange={setSelection}
        onQueryChange={setQuery}
        onClear={() => {
          setSelection([])
          setQuery('')
        }}
        options={ITEMS}
        getLabel={(item) => item.name}
        placeholder={PLACEHOLDER}
        pluralLabel="Models"
        maxSelection={maxSelection}
        clearLabel="Clear models"
      />
      <output data-testid="selection">{selection.map((item) => item.name).join(',')}</output>
    </>
  )
}

function pickFromTypeahead(name: string) {
  fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: name } })
  fireEvent.click(screen.getByRole('option', { name }))
}

function pickFromPopover(name: string) {
  fireEvent.change(screen.getByPlaceholderText('Add models'), { target: { value: name } })
  fireEvent.click(screen.getByRole('option', { name }))
}

function selectionText() {
  return screen.getByTestId('selection').textContent
}

describe('MultiSearchSelectInput', () => {
  it('labels a single pick by name and several picks by count', () => {
    render(<Harness />)

    pickFromTypeahead(ITEMS[0].name)
    expect(screen.getByRole('button', { name: ITEMS[0].name })).toBeInTheDocument()

    pickFromPopover(ITEMS[1].name)
    expect(screen.getByRole('button', { name: 'Models: 2' })).toBeInTheDocument()
    expect(selectionText()).toBe(`${ITEMS[0].name},${ITEMS[1].name}`)
  })

  it('keeps the remaining picks when one is removed', () => {
    render(<Harness />)
    pickFromTypeahead(ITEMS[0].name)
    pickFromPopover(ITEMS[1].name)

    fireEvent.click(screen.getByRole('button', { name: `Remove ${ITEMS[0].name}` }))

    expect(selectionText()).toBe(ITEMS[1].name)
  })

  it('offers only unpicked items', () => {
    render(<Harness />)
    pickFromTypeahead(ITEMS[0].name)

    fireEvent.change(screen.getByPlaceholderText('Add models'), { target: { value: 'IRADX' } })

    expect(screen.queryByRole('option', { name: ITEMS[0].name })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: ITEMS[1].name })).toBeInTheDocument()
  })

  it('replaces the search with a note at the maximum', () => {
    render(<Harness maxSelection={TWO_ITEM_MAX} />)
    pickFromTypeahead(ITEMS[0].name)
    pickFromPopover(ITEMS[1].name)

    expect(screen.queryByPlaceholderText('Add models')).not.toBeInTheDocument()
    expect(
      screen.getByText(`Maximum ${TWO_ITEM_MAX} models. Remove one to add another.`),
    ).toBeInTheDocument()
  })

  it('returns to the typeahead when everything is cleared', () => {
    render(<Harness />)
    pickFromTypeahead(ITEMS[0].name)

    fireEvent.click(screen.getByRole('button', { name: 'Clear models' }))

    expect(selectionText()).toBe('')
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
  })
})
