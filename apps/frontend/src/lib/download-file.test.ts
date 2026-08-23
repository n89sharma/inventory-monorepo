import { describe, expect, it } from 'vitest'
import { toFilenameStem } from './download-file'

const FALLBACK = 'INV-000123'

describe('toFilenameStem', () => {
  it('keeps a reference that is already filename-safe', () => {
    expect(toFilenameStem('ACME-889_B', FALLBACK)).toBe('ACME-889_B')
  })

  it('replaces each run of unsafe characters with a single hyphen', () => {
    expect(toFilenameStem('ACME INV / 12', FALLBACK)).toBe('ACME-INV-12')
  })

  it('trims leading and trailing separators', () => {
    expect(toFilenameStem('#ACME#', FALLBACK)).toBe('ACME')
  })

  it('truncates an over-long reference and re-trims', () => {
    expect(toFilenameStem(`${'A'.repeat(59)} tail`, FALLBACK)).toBe('A'.repeat(59))
  })

  it('falls back to the system number when nothing survives', () => {
    expect(toFilenameStem('###', FALLBACK)).toBe(FALLBACK)
  })
})
