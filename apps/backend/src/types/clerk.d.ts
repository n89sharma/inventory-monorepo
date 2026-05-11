import type { AppRole } from 'shared-types'

export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: AppRole
    }
  }
}

declare module 'express' {
  interface Locals {
    dbUserId: number
    dbUserRole: AppRole | null
  }
}
