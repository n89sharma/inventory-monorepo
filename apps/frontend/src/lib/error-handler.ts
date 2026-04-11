import { isAxiosError, type AxiosError } from "axios"
import type { ApiResponse } from "shared-types"

export function apiErrorHandler<T>(error: Error | AxiosError<ApiResponse<T>>): ApiResponse<T> {

  if (isAxiosError(error)) {
    //AxiosError
    if (error.response) {
      //status code > 2xx
      const body = error.response.data
      if (body && !body.success) {
        return { success: false, error: body.error }
      }
      return {
        success: false,
        error: { type: 'API_ERROR', summary: 'Request failed' }
      }
    } else if (error.request) {
      //no response
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          summary: 'No response from server. Check connection',
          details: error.request
        }
      }
    } else {
      //config setup error
      return {
        success: false,
        error: {
          type: 'CONFIG',
          summary: 'Client configuration error.',
          details: error.message
        }
      }
    }
  }

  return {
    success: false,
    error: {
      type: 'OTHER',
      summary: error.name,
      details: error.message
    }
  }
}