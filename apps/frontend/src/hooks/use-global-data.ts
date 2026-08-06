import { getReferenceData } from '@/data/api/reference-data-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useEffect, useState } from 'react'

export function useGlobalData(enabled = false) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const setReferenceData = useReferenceDataStore((state) => state.setReferenceData)

  useEffect(() => {
    if (!enabled) return
    getReferenceData()
      .then((referenceData) => {
        setReferenceData(referenceData)
        setIsReady(true)
      })
      .catch((err) => setError(err))
  }, [enabled, setReferenceData])

  return { isReady, error }
}
