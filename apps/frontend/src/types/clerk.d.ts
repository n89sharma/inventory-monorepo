import type { AppRole } from 'shared-types'

export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: AppRole
    }
  }
}
