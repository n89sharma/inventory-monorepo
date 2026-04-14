import { getReferenceData as getConstantsApi } from '@/data/api/reference-data-api'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useEffect, useState } from 'react'

export function useConstantsData() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const setConstants = useReferenceDataStore((state) => state.setReferenceData)

  useEffect(() => {
    const controller = new AbortController()
    async function getConstants() {
      try {
        setLoading(true)
        setConstants(await getConstantsApi())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    getConstants()
    return () => controller.abort()
  }, [])

  return { loading, error }
}