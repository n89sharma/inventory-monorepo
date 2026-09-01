import type { OrgDetail, User, Warehouse } from 'shared-types'
import type { SelectOption } from './select-option-types'

export type SearchOptions = {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin?: SelectOption<Warehouse>
  destination?: SelectOption<Warehouse>
  holdBy?: SelectOption<User>
  holdFor?: SelectOption<User>
  customer?: SelectOption<OrgDetail>
  vendor?: SelectOption<OrgDetail>
}

export type SetSearchOptions = {
  setFromDate: (d: SelectOption<Date>) => void
  setToDate: (d: SelectOption<Date>) => void
  setOrigin?: (o: SelectOption<Warehouse>) => void
  setDestination?: (d: SelectOption<Warehouse>) => void
  setHoldBy?: (b: SelectOption<User>) => void
  setHoldFor?: (f: SelectOption<User>) => void
  setCustomer?: (c: SelectOption<OrgDetail>) => void
  setVendor?: (v: SelectOption<OrgDetail>) => void
}
