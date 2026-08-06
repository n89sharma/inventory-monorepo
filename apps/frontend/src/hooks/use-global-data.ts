import { getModels } from '@/data/api/model-api'
import { getReferenceData } from '@/data/api/reference-data-api'
import { getUsers } from '@/data/api/user-api'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUserStore } from '@/data/store/user-store'
import { useEffect, useState } from 'react'

export function useGlobalData(enabled = false) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const setModels = useModelStore((state) => state.setModels)
  const setReferenceData = useReferenceDataStore((state) => state.setReferenceData)
  const setUsers = useUserStore((state) => state.setUsers)

  useEffect(() => {
    if (!enabled) return
    Promise.all([getModels(), getReferenceData(), getUsers()])
      .then(([models, referenceData, users]) => {
        setModels(models)
        setReferenceData(referenceData)
        setUsers(users)
        setIsReady(true)
      })
      .catch((err) => setError(err))
  }, [enabled, setModels, setReferenceData, setUsers])

  return { isReady, error }
}
