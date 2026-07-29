import { PriceInput, type EditablePriceField } from '@/components/shared/price-input'
import type { Table } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'

const COMMIT_KEY = 'Enter'
const REVERT_KEY = 'Escape'

type SaveStatus = 'idle' | 'saving' | 'error'

function toNumber(value: string): number {
  return parseFloat(value) || 0
}

interface InvoicePriceCellProps {
  asset: AssetSummary
  field: EditablePriceField
  label: string
  table: Table<AssetSummary>
}

export function InvoicePriceCell({
  asset,
  field,
  label,
  table,
}: InvoicePriceCellProps): React.JSX.Element {
  const savedValue = asset.cost?.[field] ?? 0
  const [value, setValue] = useState(String(savedValue))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const focusedRef = useRef(false)

  // A background revalidation can replace the row while the field is being typed in;
  // only adopt the incoming value when the caret is not in this cell.
  useEffect(() => {
    if (focusedRef.current) return
    setValue(String(savedValue))
  }, [savedValue])

  async function commit() {
    focusedRef.current = false
    const parsed = toNumber(value)
    if (parsed === savedValue) return
    // A revalidation can land while the request is in flight and overwrite the box, so the
    // typed text is held here and put back if the save fails.
    const typed = value
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
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === COMMIT_KEY) {
      event.currentTarget.blur()
      return
    }
    if (event.key === REVERT_KEY) {
      // Deliberately does not blur: the caret stays put, and whenever the user does leave
      // the restored value equals savedValue, so the no-op guard silences that commit.
      setValue(String(savedValue))
      setStatus('idle')
    }
  }

  return (
    <PriceInput
      value={value}
      onChange={setValue}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onFocus={() => (focusedRef.current = true)}
      saving={status === 'saving'}
      invalid={status === 'error'}
      label={`${label} for ${asset.barcode}`}
    />
  )
}
