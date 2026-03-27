import { useOrgStore } from '@/data/store/org-store'
import { useState, useEffect } from 'react'
import { getOrgs as getOrgsApi } from '@/data/api/org-api'

export function useOrgData() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const setOrganizations = useOrgStore((state) => state.setOrganizations)

  useEffect(() => {
    const controller = new AbortController()
    async function getOrgs() {
      try {
        setLoading(true)
        setOrganizations(await getOrgsApi())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    getOrgs()
    return () => controller.abort()
  }, [])

  return { loading, error }
}