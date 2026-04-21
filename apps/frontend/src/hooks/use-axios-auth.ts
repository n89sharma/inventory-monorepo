import { useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { api } from '@/data/api/axios-client'

export function useAxiosAuth() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const token = await getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    return () => {
      api.interceptors.request.eject(requestInterceptor)
    }
  }, [getToken, isSignedIn])
}
