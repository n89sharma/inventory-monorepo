import { PriceInput, type EditablePriceField } from '@/components/shared/price-input'
import type { Table } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'

const COMMIT_KEY = 'Enter'
const REVERT_KEY = 'Escape'

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
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const focusedRef = useRef(false)
  const revertedRef = useRef(false)

  // A background revalidation can replace the row while the field is being typed in;
  // only adopt the incoming value when the caret is not in this cell.
  useEffect(() => {
    if (focusedRef.current) return
    setValue(String(savedValue))
  }, [savedValue])

  async function commit() {
    focusedRef.current = false
    if (revertedRef.current) {
      revertedRef.current = false
      return
    }
    const parsed = toNumber(value)
    if (parsed === savedValue) return
    setSaving(true)
    try {
      await table.options.meta?.savePriceField?.(asset.barcode, field, parsed)
      setInvalid(false)
    } catch {
      // The typed value stays put so the edit is not lost; the interceptor toasts.
      setInvalid(true)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === COMMIT_KEY) {
      event.currentTarget.blur()
      return
    }
    if (event.key === REVERT_KEY) {
      revertedRef.current = true
      setValue(String(savedValue))
      setInvalid(false)
      event.currentTarget.blur()
    }
  }

  return (
    <PriceInput
      value={value}
      onChange={setValue}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onFocus={() => (focusedRef.current = true)}
      saving={saving}
      invalid={invalid}
      label={`${label} for ${asset.barcode}`}
    />
  )
}
