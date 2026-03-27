export interface ApiError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'CONFIG'
  status?: string
  summary: string
  details: string
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError | Error }