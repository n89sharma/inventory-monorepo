import type { Permission } from 'shared-types'

export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: string
    }
  }
}

declare module 'express' {
  interface Locals {
    dbUserId: number
    permissions: ReadonlySet<Permission>
  }
}
