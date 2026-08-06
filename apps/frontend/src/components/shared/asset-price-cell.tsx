import { PriceInput } from '@/components/shared/price-input'
import { formatUSDWithSymbol } from '@/lib/formatters'
import {
  isEditablePriceField,
  resolveAdjacentPriceCell,
  type EditablePriceField,
  type PriceCellDirection,
  type PriceCellEditorRegistry,
  type PriceGridLayout,
} from '@/lib/price-cell-navigation'
import type { Row, Table } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'

const MOVE_DOWN_KEY = 'Enter'
const REVERT_KEY = 'Escape'
const MOVE_FIELD_KEY = 'Tab'
const ENTRY_TAB_INDEX = 0
const ROVING_TAB_INDEX = -1
const READ_BUTTON_CLASS =
  'h-8 w-full rounded-lg border border-transparent px-2.5 py-1 text-base tabular-nums ' +
  'transition-colors outline-none cursor-text md:text-sm ' +
  'hover:border-input hover:bg-muted/40 ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ' +
  'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 ' +
  'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

type SaveStatus = 'idle' | 'saving' | 'error'

function toNumber(value: string): number {
  return parseFloat(value) || 0
}

function readPriceGridLayout(table: Table<AssetSummary>): PriceGridLayout {
  return {
    rowIds: table.getRowModel().rows.map((row) => row.id),
    fields: table
      .getVisibleLeafColumns()
      .map((column) => column.id)
      .filter(isEditablePriceField),
  }
}

function isKeyboardEntryCell(
  table: Table<AssetSummary>,
  rowId: string,
  field: EditablePriceField,
): boolean {
  if (table.getRowModel().rows[0]?.id !== rowId) return false
  return (
    table.getVisibleLeafColumns().find((column) => isEditablePriceField(column.id))?.id === field
  )
}

interface PriceButtonProps {
  amount: number
  label: string
  invalid: boolean
  tabIndex: typeof ENTRY_TAB_INDEX | typeof ROVING_TAB_INDEX
  ref: React.RefCallback<HTMLButtonElement>
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}

function PriceButton({
  amount,
  label,
  invalid,
  tabIndex,
  ref,
  onClick,
  onKeyDown,
}: PriceButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      ref={ref}
      tabIndex={tabIndex}
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={READ_BUTTON_CLASS}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {formatUSDWithSymbol(amount)}
    </button>
  )
}

interface AssetPriceCellProps {
  row: Row<AssetSummary>
  field: EditablePriceField
  label: string
  table: Table<AssetSummary>
  editorRegistry: PriceCellEditorRegistry
}

export function AssetPriceCell({
  row,
  field,
  label,
  table,
  editorRegistry,
}: AssetPriceCellProps): React.JSX.Element {
  const asset = row.original
  const currSavedValue = asset.cost?.[field] ?? 0
  const [prevSavedValue, setPrevSavedValue] = useState(currSavedValue)
  const [value, setValue] = useState(String(currSavedValue))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [focusReadButtonOnAttach, setFocusReadButtonOnAttach] = useState(false)
  const sentValueRef = useRef<number | null>(null)

  useEffect(
    () => editorRegistry.register({ rowId: row.id, field }, () => setIsEditing(true)),
    [editorRegistry, row.id, field],
  )

  if (!isEditing && prevSavedValue !== currSavedValue) {
    setPrevSavedValue(currSavedValue)
    setValue(String(currSavedValue))
  }

  function focusReadButtonWhenAttached(node: HTMLButtonElement | null) {
    if (!node || !focusReadButtonOnAttach) return
    setFocusReadButtonOnAttach(false)
    node.focus()
  }

  function stopEditing(restoreFocus: boolean) {
    setFocusReadButtonOnAttach(restoreFocus)
    setIsEditing(false)
  }

  async function commit() {
    const parsed = toNumber(value)
    if (parsed === currSavedValue || parsed === sentValueRef.current) return
    // A revalidation can land while the request is in flight and overwrite the box, so the
    // typed text is held here and put back if the save fails.
    const typed = value
    sentValueRef.current = parsed
    setStatus('saving')
    try {
      const save = table.options.meta?.savePriceField
      // Optional because TableMeta is a single interface shared by every table in the app,
      // so a page that forgets to pass meta would otherwise no-op and look like a success.
      if (!save) throw new Error('savePriceField is missing from the table meta')
      await save(asset.barcode, field, parsed)
      setStatus('idle')
    } catch {
      // The typed value goes back so the edit is not lost; the interceptor toasts.
      setValue(typed)
      setStatus('error')
    }
    sentValueRef.current = null
  }

  function moveTo(direction: PriceCellDirection, event: React.SyntheticEvent): boolean {
    const target = resolveAdjacentPriceCell(
      readPriceGridLayout(table),
      { rowId: row.id, field },
      direction,
    )
    if (!target) return false
    event.preventDefault()
    void commit()
    stopEditing(false)
    editorRegistry.beginEditing(target)
    return true
  }

  function directionForKey(event: React.KeyboardEvent): PriceCellDirection | null {
    if (event.key === MOVE_DOWN_KEY) return 'nextRow'
    if (event.key !== MOVE_FIELD_KEY) return null
    return event.shiftKey ? 'previousField' : 'nextField'
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === REVERT_KEY) {
      setValue(String(currSavedValue))
      setStatus('idle')
      stopEditing(true)
      return
    }
    const direction = directionForKey(event)
    if (!direction || moveTo(direction, event)) return
    event.preventDefault()
    void commit()
    stopEditing(true)
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const direction = directionForKey(event)
    if (direction === null || direction === 'nextRow') return
    moveTo(direction, event)
  }

  if (!isEditing) {
    return (
      <PriceButton
        amount={toNumber(value)}
        label={`${label} for ${asset.barcode}`}
        invalid={status === 'error'}
        tabIndex={isKeyboardEntryCell(table, row.id, field) ? ENTRY_TAB_INDEX : ROVING_TAB_INDEX}
        ref={focusReadButtonWhenAttached}
        onClick={() => setIsEditing(true)}
        onKeyDown={handleButtonKeyDown}
      />
    )
  }

  return (
    <PriceInput
      autoFocus
      value={value}
      onChange={setValue}
      onBlur={() => {
        void commit()
        stopEditing(false)
      }}
      onKeyDown={handleInputKeyDown}
      onFocus={(event) => event.currentTarget.select()}
      saving={status === 'saving'}
      invalid={status === 'error'}
      label={`${label} for ${asset.barcode}`}
    />
  )
}
