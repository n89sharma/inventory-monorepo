import type { FlatResult } from '../global-search/search-results'

export type SelectedCollection = Exclude<FlatResult, { kind: 'asset' }>
