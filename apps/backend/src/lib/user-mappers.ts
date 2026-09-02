import { User } from 'shared-types'
import type { User as PrismaUser } from '../../generated/prisma/client.js'

export function mapUser(user: PrismaUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.is_active,
    role: user.role,
    clerk_id: user.clerk_id,
    default_warehouse_id: user.default_warehouse_id,
  }
}
