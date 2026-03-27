import { api } from '@/data/api/axios-client'
import type { Warehouse } from 'shared-types'
import { type Departure, DepartureSchema, getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from 'shared-types'
import { z } from 'zod'

export async function getDepartures(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
): Promise<Departure[]> {

  const res = await api.get(`/departures`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      warehouse: getIdOrNullFromSelection(origin),
    }
  })
  return z.array(DepartureSchema).parse(res.data)
}