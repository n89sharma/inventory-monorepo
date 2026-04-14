import { getModels } from '@/data/api/model-api'
import { getOrgs } from '@/data/api/org-api'
import { getReferenceData } from '@/data/api/reference-data-api'
import { getUsers } from '@/data/api/user-api'
import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUserStore } from '@/data/store/user-store'
import { useEffect, useState } from 'react'

export function useGlobalData() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const setModels = useModelStore(state => state.setModels)
  const setOrganizations = useOrgStore(state => state.setOrganizations)
  const setReferenceData = useReferenceDataStore(state => state.setReferenceData)
  const setUsers = useUserStore(state => state.setUsers)

  useEffect(() => {
    Promise.all([getModels(), getOrgs(), getReferenceData(), getUsers()])
      .then(([models, orgs, referenceData, users]) => {
        setModels(models)
        setOrganizations(orgs)
        setReferenceData(referenceData)
        setUsers(users)
        setIsReady(true)
      })
      .catch(err => setError(err))
  }, [])

  return { isReady, error }
}
