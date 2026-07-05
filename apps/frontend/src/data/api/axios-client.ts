import axios, { isAxiosError } from 'axios'
import type { ApiResponse } from 'shared-types'
import { toast } from 'sonner'
import { z } from 'zod'

declare module 'axios' {
  export interface AxiosRequestConfig {
    // When true, the response interceptor throws without showing an error toast,
    // leaving the caller to surface the failure inline (e.g. a form field).
    skipErrorToast?: boolean
  }
}

const apiUrl = import.meta.env.VITE_INVENTORY_API_URL

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const EnvelopeSchema = z.object({ success: z.literal(true), data: z.unknown() })

api.interceptors.response.use(
  (response) => {
    const envelope = EnvelopeSchema.safeParse(response.data)
    if (envelope.success) {
      response.data = envelope.data.data
    }
    return response
  },
  (error: unknown) => {
    if (isAxiosError(error)) {
      const skipErrorToast = error.config?.skipErrorToast ?? false
      const notify = (message: string) => {
        if (!skipErrorToast) toast.error(message, { position: 'top-center' })
      }
      if (error.response) {
        if (error.response.status === 429) {
          const message = 'Too many requests. Please slow down and try again.'
          notify(message)
          throw new Error(message)
        }
        if (error.response.status === 413) {
          const message = 'Request too large. Please reduce the number of items and try again.'
          notify(message)
          throw new Error(message)
        }
        const body = error.response.data as ApiResponse<unknown> | undefined
        const message = body && !body.success ? body.error.summary : 'Request failed'
        notify(message)
        throw new Error(message)
      }
      const message = 'No response from server. Check your connection.'
      notify(message)
      throw new Error(message)
    }
    throw error
  },
)
