import { useEffect, useState } from 'react'
import { getUsers } from '@/data/api/user-api'
import { useUserStore } from '@/data/store/user-store'

export function useUserData() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const setUsers = useUserStore(state => state.setUsers)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchUsers() {
      try {
        setLoading(true)
        setUsers(await getUsers())
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('useUserData error:', err)
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
    return () => controller.abort()
  }, [])

  return { loading, error }
}
