import type { KeepStateOptions } from 'react-hook-form'

export const KEEP_USER_EDITS_ON_SERVER_REFRESH = {
  keepDirtyValues: true,
} as const satisfies KeepStateOptions

// react-hook-form merges the form-level `resetOptions` into every explicit
// `reset()` call, so a form carrying KEEP_USER_EDITS_ON_SERVER_REFRESH cannot
// clear a field the user touched unless the call opts out. Pass this to every
// deliberate reset — after a save, and on discard.
export const DISCARD_USER_EDITS = {
  keepDirtyValues: false,
} as const satisfies KeepStateOptions
