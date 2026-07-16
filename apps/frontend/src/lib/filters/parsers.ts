import { format, isValid, parseISO } from 'date-fns'
import {
  createParser,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs'
import { INVOICE_TYPE } from 'shared-types'

const DATE_ONLY_FORMAT = 'yyyy-MM-dd'
const FLAG_ON = '1'

// CSV of integer ids, matching the legacy `encodeIds`/`decodeIds` format.
export const parseAsIdList = parseAsArrayOf(parseAsInteger, ',')

const parseAsStringList = parseAsArrayOf(parseAsString, ',')

export const COLS_PARAM_KEY = 'cols'

// Non-negative integer; anything negative or unparseable clears the param.
const parseAsNonNegativeInt = createParser<number>({
  parse: (value) => {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) || parsed < 0 ? null : parsed
  },
  serialize: (value) => String(value),
})

// Date serialized as `yyyy-MM-dd` (whole-day, timezone-free), matching legacy sold filters.
const parseAsDateOnly = createParser<Date>({
  parse: (value) => {
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : null
  },
  serialize: (value) => format(value, DATE_ONLY_FORMAT),
  eq: (a, b) => a.getTime() === b.getTime(),
})

// Presence-only boolean flag serialized as `1`; absence means false.
const parseAsOnFlag = createParser<boolean>({
  parse: (value) => (value === FLAG_ON ? true : null),
  serialize: () => FLAG_ON,
})

// Invoice type filter; rejects anything outside the allow-list (absence/junk =>
// the default applied by the hook). Typed as the `'PURCHASE' | 'SALE'` union.
const INVOICE_TYPE_VALUES = [INVOICE_TYPE.purchase, INVOICE_TYPE.sales] as const
const parseAsInvoiceType = parseAsStringLiteral(INVOICE_TYPE_VALUES)

const SORT_DELIMITER = '.'
const parseAsSortDirection = parseAsStringLiteral(['asc', 'desc'] as const)

const parseAsSort = createParser<{ id: string; desc: boolean }>({
  parse: (value) => {
    const [id = '', direction = ''] = value.split(SORT_DELIMITER)
    if (!id) return null
    return { id, desc: parseAsSortDirection.parse(direction) === 'desc' }
  },
  serialize: ({ id, desc }) => `${id}${SORT_DELIMITER}${desc ? 'desc' : 'asc'}`,
  eq: (a, b) => a.id === b.id && a.desc === b.desc,
})

// Single source of truth mapping every URL key to its parser. Both the resolver
// hooks and the link serializers read from here so serialization stays identical.
export const FILTER_PARSERS = {
  wh: parseAsIdList,
  model: parseAsInteger,
  q: parseAsString,
  readiness: parseAsIdList,
  meter_min: parseAsNonNegativeInt,
  meter_max: parseAsNonNegativeInt,
  cas: parseAsNonNegativeInt,
  fin: parseAsInteger,
  brand: parseAsInteger,
  type: parseAsIdList,
  status: parseAsIdList,
  pricecheck: parseAsOnFlag,
  instock: parseAsOnFlag,
  other: parseAsOnFlag,
  from: parseAsDateOnly,
  to: parseAsDateOnly,
  customer: parseAsInteger,
  heldby: parseAsInteger,
  heldfor: parseAsInteger,
  holdcustomer: parseAsInteger,
  year: parseAsInteger,
  sp: parseAsInteger,
  vendor: parseAsInteger,
  origin: parseAsInteger,
  dest: parseAsInteger,
  invoicetype: parseAsInvoiceType,
  cols: parseAsStringList,
  sort: parseAsSort,
  warehouse: parseAsIdList,
  search: parseAsString,
  range: parseAsInteger,
  specs: parseAsOnFlag,
}
