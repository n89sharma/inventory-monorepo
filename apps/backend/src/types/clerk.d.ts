import type { AppRole, Permission } from 'shared-types'

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
    permissions: ReadonlySet<Permission>
  }
}
