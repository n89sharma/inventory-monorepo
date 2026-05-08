import axios, { isAxiosError } from "axios"
import { toast } from 'sonner'
import type { ApiResponse } from 'shared-types'

const apiUrl = import.meta.env.VITE_INVENTORY_API_URL

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json"
  }
})

api.interceptors.response.use(
  response => response,
  (error: unknown) => {
    if (isAxiosError(error)) {
      if (error.response) {
        if (error.response.status === 429) {
          const message = 'Too many requests. Please slow down and try again.'
          toast.error(message, { position: 'top-center' })
          throw new Error(message)
        }
        if (error.response.status === 413) {
          const message = 'Request too large. Please reduce the number of items and try again.'
          toast.error(message, { position: 'top-center' })
          throw new Error(message)
        }
        const body = error.response.data as ApiResponse<unknown> | undefined
        const message = (body && !body.success) ? body.error.summary : 'Request failed'
        toast.error(message, { position: 'top-center' })
        throw new Error(message)
      }
      const message = 'No response from server. Check your connection.'
      toast.error(message, { position: 'top-center' })
      throw new Error(message)
    }
    throw error
  }
)
