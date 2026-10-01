import {
  resolveAdjacentPriceCell,
  type PriceCellDirection,
  type PriceCellEditorRegistry,
  type PriceGridLayout,
} from '@/lib/price-cell-navigation'
import type { Row, Table } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'

const MOVE_DOWN_KEY = 'Enter'
const REVERT_KEY = 'Escape'
const MOVE_FIELD_KEY = 'Tab'
const ENTRY_TAB_INDEX = 0
const ROVING_TAB_INDEX = -1
const READ_BUTTON_CLASS =
  'h-7 w-full rounded-lg border border-transparent px-2.5 py-0 text-base tabular-nums ' +
  'transition-colors outline-none cursor-text md:text-sm ' +
  'hover:border-input hover:bg-muted/40 ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ' +
  'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 ' +
  'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

type SaveStatus = 'idle' | 'saving' | 'error'

type BlankAmount = 0 | null

function toAmount(value: string, blankValue: BlankAmount): number | null {
  if (value.trim() === '') return blankValue
  return parseFloat(value) || 0
}

function toText(amount: number | null): string {
  return amount === null ? '' : String(amount)
}

function visibleEditableFields<TData, F extends string>(
  table: Table<TData>,
  fieldForColumn: (columnId: string) => F | undefined,
): F[] {
  return table
    .getVisibleLeafColumns()
    .map((column) => fieldForColumn(column.id))
    .filter((field) => field !== undefined)
}

function readPriceGridLayout<TData, F extends string>(
  table: Table<TData>,
  fieldForColumn: (columnId: string) => F | undefined,
): PriceGridLayout<F> {
  return {
    rowIds: table.getRowModel().rows.map((row) => row.id),
    fields: visibleEditableFields(table, fieldForColumn),
  }
}

function isKeyboardEntryCell<TData, F extends string>(
  table: Table<TData>,
  fieldForColumn: (columnId: string) => F | undefined,
  rowId: string,
  field: F,
): boolean {
  if (table.getRowModel().rows[0]?.id !== rowId) return false
  return visibleEditableFields(table, fieldForColumn)[0] === field
}

export interface AmountInputProps {
  autoFocus: boolean
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus: (event: React.FocusEvent<HTMLInputElement>) => void
  saving: boolean
  invalid: boolean
  label: string
}

interface AmountButtonProps {
  text: string
  label: string
  invalid: boolean
  tabIndex: typeof ENTRY_TAB_INDEX | typeof ROVING_TAB_INDEX
  ref: React.RefCallback<HTMLButtonElement>
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}

function AmountButton({
  text,
  label,
  invalid,
  tabIndex,
  ref,
  onClick,
  onKeyDown,
}: AmountButtonProps): React.JSX.Element {
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
      {text}
    </button>
  )
}

interface EditableAmountCellProps<TData, F extends string> {
  row: Row<TData>
  table: Table<TData>
  field: F
  value: number | null
  blankValue: BlankAmount
  label: string
  editorRegistry: PriceCellEditorRegistry<F>
  fieldForColumn: (columnId: string) => F | undefined
  format: (amount: number | null) => string
  AmountInput: React.ComponentType<AmountInputProps>
  onSave: (value: number | null) => Promise<void>
}

export function EditableAmountCell<TData, F extends string>({
  row,
  table,
  field,
  value: currSavedValue,
  blankValue,
  label,
  editorRegistry,
  fieldForColumn,
  format,
  AmountInput,
  onSave,
}: EditableAmountCellProps<TData, F>): React.JSX.Element {
  const [prevSavedValue, setPrevSavedValue] = useState(currSavedValue)
  const [value, setValue] = useState(toText(currSavedValue))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [focusReadButtonOnAttach, setFocusReadButtonOnAttach] = useState(false)
  const sentValueRef = useRef<number | null | undefined>(undefined)

  useEffect(
    () => editorRegistry.register({ rowId: row.id, field }, () => setIsEditing(true)),
    [editorRegistry, row.id, field],
  )

  if (!isEditing && prevSavedValue !== currSavedValue) {
    setPrevSavedValue(currSavedValue)
    setValue(toText(currSavedValue))
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
    const parsed = toAmount(value, blankValue)
    if (parsed === currSavedValue || parsed === sentValueRef.current) return
    // A revalidation can land while the request is in flight and overwrite the box, so the
    // typed text is held here and put back if the save fails.
    const typed = value
    sentValueRef.current = parsed
    setStatus('saving')
    try {
      await onSave(parsed)
      setStatus('idle')
    } catch {
      // The typed value goes back so the edit is not lost; the interceptor toasts.
      setValue(typed)
      setStatus('error')
    }
    sentValueRef.current = undefined
  }

  function moveTo(direction: PriceCellDirection, event: React.SyntheticEvent): boolean {
    const target = resolveAdjacentPriceCell(
      readPriceGridLayout(table, fieldForColumn),
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
      setValue(toText(currSavedValue))
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
      <AmountButton
        text={format(toAmount(value, blankValue))}
        label={label}
        invalid={status === 'error'}
        tabIndex={
          isKeyboardEntryCell(table, fieldForColumn, row.id, field)
            ? ENTRY_TAB_INDEX
            : ROVING_TAB_INDEX
        }
        ref={focusReadButtonWhenAttached}
        onClick={() => setIsEditing(true)}
        onKeyDown={handleButtonKeyDown}
      />
    )
  }

  return (
    <AmountInput
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
      label={label}
    />
  )
}
