import { describe, expect, it } from 'vitest'
import { getEnvHeaderBg } from './environment'

describe('getEnvHeaderBg', () => {
  it('tints dev for localhost', () => {
    expect(getEnvHeaderBg('http://localhost:3000/')).toBe('bg-orange-100')
  })

  it('tints dev for 127.0.0.1', () => {
    expect(getEnvHeaderBg('http://127.0.0.1:3000/')).toBe('bg-orange-100')
  })

  it('tints staging for a staging.api. host', () => {
    expect(getEnvHeaderBg('https://staging.api.loon.app/')).toBe('bg-amber-100')
  })

  it('leaves production untinted', () => {
    expect(getEnvHeaderBg('https://api.loon.app/')).toBe('')
  })

  it('leaves an unknown host untinted rather than mislabelling it', () => {
    expect(getEnvHeaderBg('https://staging.api2.loon.app/')).toBe('')
  })

  it('returns untinted for a malformed url', () => {
    expect(getEnvHeaderBg('not-a-url')).toBe('')
  })
})
