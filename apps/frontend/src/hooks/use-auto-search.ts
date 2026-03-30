import type { SearchOptions, SetSearchOptions } from '@/ui-types/search-option-types'
import { ANY_OPTION, getSelectOption } from '@/ui-types/select-option-types'
import { subDays } from 'date-fns'
import { useEffect, useRef } from 'react'


export function useAutoSearch(
  hasSearched: boolean,
  onSearchSetData: (searchOptions: SearchOptions) => Promise<void>,
  setSearchOptions: SetSearchOptions,
  defaultDays: number = 60
) {
  const callbackRef = useRef(onSearchSetData)
  callbackRef.current = onSearchSetData

  useEffect(() => {
    if (!hasSearched) {
      const { setFromDate, setToDate, setOrigin, setDestination, setHoldFor, setHoldBy } = setSearchOptions

      const from = getSelectOption(subDays(new Date(), defaultDays))
      const to = getSelectOption(new Date())
      setFromDate(from)
      setToDate(to)

      if (setOrigin) setOrigin(ANY_OPTION)
      if (setDestination) setDestination(ANY_OPTION)
      if (setHoldBy) setHoldBy(ANY_OPTION)
      if (setHoldFor) setHoldFor(ANY_OPTION)

      callbackRef.current({
        fromDate: getSelectOption(subDays(new Date(), defaultDays)),
        toDate: getSelectOption(new Date()),
        origin: ANY_OPTION,
        destination: ANY_OPTION,
        holdBy: ANY_OPTION,
        holdFor: ANY_OPTION
      })
    }
  }, [])
}
