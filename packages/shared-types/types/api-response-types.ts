type API_ERROR_TYPE = 'API_ERROR' | 'NETWORK_ERROR' | 'CONFIG' | 'OTHER'

export type ApiError = {
  type: API_ERROR_TYPE
  status?: number
  summary: string
  details?: string
}

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError }

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data: data,
  }
}

export function response400<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 400,
      summary: summary,
      details: details,
    },
  }
}

export function response401<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 401,
      summary: summary,
      details: details,
    },
  }
}

export function response403<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 403,
      summary: summary,
      details: details,
    },
  }
}

export function response404<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 404,
      summary: summary,
      details: details,
    },
  }
}

export function response409<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 409,
      summary: summary,
      details: details,
    },
  }
}

export function response500<T>(summary: string, details?: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      status: 500,
      summary: summary,
      details: details,
    },
  }
}
