import { getAssetsBySerialNumber } from '@/data/api/asset-api'
import type { AssetsBySerialNumberResult } from 'shared-types'
import useSWR from 'swr'

const ASSETS_BY_SERIAL_NUMBER_KEY = 'assets-by-serial-number'

export function useAssetsBySerialNumber(serialNumbers: string[]) {
  return useSWR<AssetsBySerialNumberResult>(
    serialNumbers.length > 0 ? [ASSETS_BY_SERIAL_NUMBER_KEY, serialNumbers] : null,
    ([, numbers]: [string, string[]]) => getAssetsBySerialNumber(numbers),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
