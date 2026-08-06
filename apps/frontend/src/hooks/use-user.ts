import { getUsers } from '@/data/api/user-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { User } from 'shared-types'
import useSWR, { mutate } from 'swr'

const USERS_KEY = 'users'
const EMPTY_USERS: User[] = []

function useUsersQuery() {
  return useSWR(USERS_KEY, getUsers, CATALOG_DATA_OPTIONS)
}

export function useUsers(): User[] {
  return useUsersQuery().data ?? EMPTY_USERS
}

export function useUsersLoaded(): boolean {
  return useUsersQuery().data !== undefined
}

export function invalidateUsers() {
  return mutate(USERS_KEY)
}
