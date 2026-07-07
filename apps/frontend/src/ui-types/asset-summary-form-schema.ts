import { AssetSummarySchema } from 'shared-types'
import { z } from 'zod'

// AssetSummarySchema declares created_at as z.coerce.date() so API responses can
// parse their ISO-string dates into Date objects. Inside react-hook-form the
// asset is already a parsed AssetSummary (created_at is a Date), and z.coerce's
// `unknown` input type breaks the resolver's inferred field-values type. Re-declaring
// created_at as z.date() keeps the form schema's input and output types aligned
// with the hand-written form types.
export const AssetSummaryFormSchema = AssetSummarySchema.extend({
  created_at: z.date(),
})
