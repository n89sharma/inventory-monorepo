import { getReferenceData as getReferenceDataApi } from '@/data/api/reference-data-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useEffect, useState } from 'react'

export function useReferenceData() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const setReferenceData = useReferenceDataStore((state) => state.setReferenceData)

  useEffect(() => {
    const controller = new AbortController()
    async function getReferenceData() {
      try {
        setLoading(true)
        setReferenceData(await getReferenceDataApi())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    getReferenceData()
    return () => controller.abort()
  }, [])

  return { loading, error }
}