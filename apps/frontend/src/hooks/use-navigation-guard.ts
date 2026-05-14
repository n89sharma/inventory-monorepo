import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseNavigationGuardOptions {
  isDirty: boolean
}

export function useNavigationGuard({ isDirty }: UseNavigationGuardOptions) {
  const navigate = useNavigate()
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function guardedNavigate(to: string) {
    if (isDirty) {
      setPendingPath(to)
      return
    }
    navigate(to)
  }

  function onOpenChange(open: boolean) {
    if (!open) setPendingPath(null)
  }

  function onDiscard() {
    const path = pendingPath
    setPendingPath(null)
    if (path) navigate(path)
  }

  return {
    isBlocked: pendingPath !== null,
    onOpenChange,
    onDiscard,
    guardedNavigate,
  }
}
