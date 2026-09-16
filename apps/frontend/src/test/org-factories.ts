import type { OrgDetail } from 'shared-types'

export function makeOrgDetail(id: number, name: string): OrgDetail {
  return {
    id,
    account_number: null,
    name,
    contact_name: null,
    phone: null,
    mobile: null,
    primary_email: null,
    address: null,
    city: null,
    province: null,
    country: null,
  }
}
