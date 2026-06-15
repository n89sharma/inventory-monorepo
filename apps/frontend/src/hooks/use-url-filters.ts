import { useEffect, useRef, useState } from 'react'

const DEFAULT_FILTER_DEBOUNCE_MS = 600

export function useUrlFilters<TFilters>(
  urlFilters: TFilters,
  filtersToParams: (filters: TFilters) => URLSearchParams,
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void,
  debounceMs: number = DEFAULT_FILTER_DEBOUNCE_MS,
): {
  draft: TFilters
  updateImmediate: (next: TFilters) => void
  updateDebounced: (next: TFilters) => void
} {
  const [draft, setDraft] = useState<TFilters>(urlFilters)
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters)
  const debounceTimerRef = useRef<number | null>(null)
  const lastCommittedKeyRef = useRef<string>(filtersToParams(urlFilters).toString())

  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters)
    const urlKey = filtersToParams(urlFilters).toString()
    if (urlKey !== lastCommittedKeyRef.current) {
      setDraft(urlFilters)
      lastCommittedKeyRef.current = urlKey
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  function commitNow(next: TFilters) {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const params = filtersToParams(next)
    lastCommittedKeyRef.current = params.toString()
    setSearchParams(params, { replace: true })
  }

  function scheduleCommit(next: TFilters) {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      const params = filtersToParams(next)
      lastCommittedKeyRef.current = params.toString()
      setSearchParams(params, { replace: true })
    }, debounceMs)
  }

  function updateImmediate(next: TFilters) {
    setDraft(next)
    commitNow(next)
  }

  function updateDebounced(next: TFilters) {
    setDraft(next)
    scheduleCommit(next)
  }

  return { draft, updateImmediate, updateDebounced }
}
