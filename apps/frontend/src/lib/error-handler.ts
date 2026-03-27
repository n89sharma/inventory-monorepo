import { isAxiosError, type AxiosError } from "axios"
import type { ApiError, ApiResponse } from "shared-types"

export function apiErrorHandler<T>(error: Error | AxiosError<ApiError>): ApiResponse<T> {

  if (isAxiosError(error)) {
    //AxiosError
    if (error.response) {
      //status code > 2xx
      return {
        success: false,
        error: error.response.data
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
    error: error
  }
}