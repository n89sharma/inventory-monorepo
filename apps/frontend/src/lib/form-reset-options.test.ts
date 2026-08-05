import { act, renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { DISCARD_USER_EDITS, KEEP_USER_EDITS_ON_SERVER_REFRESH } from './form-reset-options'

interface Fields {
  serialNumber: string
  comment: string
}

const BLANK: Fields = { serialNumber: '', comment: '' }
const FROM_SERVER: Fields = { serialNumber: 'SERVER-SN', comment: 'server comment' }
const TYPED = 'TYPED-SN'

function renderGuardedForm() {
  return renderHook(
    ({ values }: { values: Fields }) =>
      useForm<Fields>({ values, resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH }),
    { initialProps: { values: BLANK } },
  )
}

describe('form reset options', () => {
  it('keeps a touched field when the server payload changes underneath the form', () => {
    const { result, rerender } = renderGuardedForm()
    act(() => result.current.setValue('serialNumber', TYPED, { shouldDirty: true }))

    rerender({ values: FROM_SERVER })

    expect(result.current.getValues('serialNumber')).toBe(TYPED)
    expect(result.current.getValues('comment')).toBe(FROM_SERVER.comment)
  })

  it('clears a touched field when the reset opts out of keeping edits', () => {
    const { result } = renderGuardedForm()
    act(() => result.current.setValue('serialNumber', TYPED, { shouldDirty: true }))

    act(() => result.current.reset(BLANK, DISCARD_USER_EDITS))

    expect(result.current.getValues('serialNumber')).toBe('')
  })

  it('drops the dirty flags so a later reset is not blocked by a stale edit', () => {
    const { result } = renderGuardedForm()
    act(() => result.current.setValue('serialNumber', TYPED, { shouldDirty: true }))
    act(() => result.current.reset(BLANK, DISCARD_USER_EDITS))

    act(() => result.current.reset(FROM_SERVER))

    expect(result.current.getValues('serialNumber')).toBe(FROM_SERVER.serialNumber)
  })

  // react-hook-form merges the form-level resetOptions into every explicit reset(),
  // which is why the opt-out has to exist. If this ever starts failing the library
  // has changed its semantics and DISCARD_USER_EDITS can go.
  it('ignores a plain reset for a touched field while the form-level option is set', () => {
    const { result } = renderGuardedForm()
    act(() => result.current.setValue('serialNumber', TYPED, { shouldDirty: true }))

    act(() => result.current.reset(BLANK))

    expect(result.current.getValues('serialNumber')).toBe(TYPED)
  })
})
