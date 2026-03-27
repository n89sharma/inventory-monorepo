import { useModelStore } from '@/data/store/model-store'
import { useState, useEffect } from 'react'
import { getModels as getModelsApi } from '@/data/api/model-api'

export function useModelData() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const setModels = useModelStore((state) => state.setModels)

  useEffect(() => {
    const controller = new AbortController()
    async function getModels() {
      try {
        setLoading(true)
        setModels(await getModelsApi())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    getModels()
    return () => controller.abort()
  }, [])

  return { loading, error }
}