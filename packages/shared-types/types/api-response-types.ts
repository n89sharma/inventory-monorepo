type API_ERROR_TYPE = 'API_ERROR' | 'NETWORK_ERROR' | 'CONFIG' | 'OTHER'

export type ApiError = {
  type: API_ERROR_TYPE
  status?: number
  summary: string
  details?: string
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data: data
  }
}

export function response400<T>(summary: string, details?: any): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 400,
      summary: summary,
      details: details
    }
  }
}

export function response500<T>(summary: string, details?: any): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 500,
      summary: summary,
      details: details
    }
  }
}