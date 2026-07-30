import type { KeepStateOptions } from 'react-hook-form'

export const KEEP_USER_EDITS_ON_SERVER_REFRESH = {
  keepDirtyValues: true,
} as const satisfies KeepStateOptions
