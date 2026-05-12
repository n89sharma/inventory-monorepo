import { z } from 'zod'

const RecordBase = {
  user_name: z.string(),
  changed_on: z.coerce.date(),
}

export const CollectionHistoryRecordSchema = z.discriminatedUnion('action_type', [
  z.object({
    action_type: z.literal('CREATE'),
    ...RecordBase,
    changes: z.record(z.string(), z.unknown())
  }),
  z.object({
    action_type: z.literal('UPDATE'),
    ...RecordBase,
    changes: z.object({
      before: z.record(z.string(), z.unknown()),
      after: z.record(z.string(), z.unknown())
    })
  }),
  z.object({
    action_type: z.literal('ASSETS_ADDED'),
    ...RecordBase,
    changes: z.object({ barcodes: z.array(z.string()) })
  }),
  z.object({
    action_type: z.literal('ASSETS_REMOVED'),
    ...RecordBase,
    changes: z.object({ barcodes: z.array(z.string()) })
  })
])

export const CollectionHistorySchema = z.array(CollectionHistoryRecordSchema)

export type CollectionHistoryRecord = z.infer<typeof CollectionHistoryRecordSchema>
export type CollectionHistory = z.infer<typeof CollectionHistorySchema>
