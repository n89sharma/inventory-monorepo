export type CollectionHistoryRecord =
  | {
      action_type: 'CREATE'
      user_name: string
      changed_on: Date
      changes: Record<string, unknown>
    }
  | {
      action_type: 'UPDATE'
      user_name: string
      changed_on: Date
      changes: { before: Record<string, unknown>; after: Record<string, unknown> }
    }
  | {
      action_type: 'ASSETS_ADDED'
      user_name: string
      changed_on: Date
      changes: { barcodes: string[] }
    }
  | {
      action_type: 'ASSETS_REMOVED'
      user_name: string
      changed_on: Date
      changes: { barcodes: string[] }
    }

export type CollectionHistory = CollectionHistoryRecord[]
