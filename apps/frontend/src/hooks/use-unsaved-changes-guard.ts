import { useState } from 'react'

/**
 * Intercepts a Dialog's close when there are unsaved edits and routes it through
 * a confirmation step. RHF-agnostic: `isDirty` is a plain boolean, so form-based
 * and useState-based modals share one behaviour.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  setOpen: (open: boolean) => void,
  onDiscard?: () => void,
) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  function onOpenChange(next: boolean) {
    if (next) {
      setOpen(true)
      return
    }
    if (isDirty) {
      setConfirmOpen(true)
      return
    }
    setOpen(false)
  }

  function discard() {
    setConfirmOpen(false)
    onDiscard?.()
    setOpen(false)
  }

  return { onOpenChange, confirmOpen, setConfirmOpen, discard }
}
