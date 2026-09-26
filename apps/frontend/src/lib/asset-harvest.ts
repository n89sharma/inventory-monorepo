import { ASSET_STATUS } from 'shared-types'

export function isHarvestable(status: string, isInTransit: boolean): boolean {
  return status === ASSET_STATUS.IN_STOCK && !isInTransit
}

export function isUnharvestable(status: string, departureNumber: string | null): boolean {
  return status === ASSET_STATUS.HARVESTED && departureNumber === null
}
