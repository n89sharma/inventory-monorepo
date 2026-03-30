import { api } from '@/data/api/axios-client'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { User } from 'shared-types'
import { HoldSchema, type Hold } from 'shared-types'
import { z } from 'zod'

export async function getHolds(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>
): Promise<Hold[]> {
  const res = await api.get(`/holds`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      holdBy: getIdOrNullFromSelection(holdBy),
      holdFor: getIdOrNullFromSelection(holdFor)
    }
  })
  return z.array(HoldSchema).parse(res.data)
}
