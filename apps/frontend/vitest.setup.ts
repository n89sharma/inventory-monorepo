import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom ships no ResizeObserver, and Radix measures its controls with one (the Checkbox's
// hidden bubble input, among others). A no-op observer is enough: nothing under test asserts
// on a measured size.
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= NoopResizeObserver

afterEach(() => {
  cleanup()
})
