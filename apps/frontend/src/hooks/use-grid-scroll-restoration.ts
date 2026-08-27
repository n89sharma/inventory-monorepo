import { readGridScrollPosition, writeGridScrollPosition } from '@/lib/grid-scroll-positions'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// Restores a scroll region to where the reader left it, and otherwise resets it to the top
// when the result set is rebuilt.
//
// scrollKey is null for a region that should not be remembered, so the hook never asks which
// kind of table it is serving. It names one scroll region on one path — not one history entry,
// because a breadcrumb back to a list and a nav link to the same list are both pushes and are
// indistinguishable from each other. What separates one list from another is the row count the
// offset was taken at, which is checked before the offset is applied.
//
// The returned initialOffset belongs to a virtualiser, which needs the offset at its first
// render to pick the right row window. Without it the window is built for the top of the list
// and corrected a frame later, which reads as a flash of the wrong rows.
export function useGridScrollRestoration(
  scrollRegionRef: RefObject<HTMLDivElement | null>,
  scrollKey: string | null,
  rowCount: number,
): { initialOffset: number } {
  // Read once, before the first render returns, because a virtualiser reads initialOffset
  // when it is constructed and never again.
  const [restorePoint] = useState(() =>
    scrollKey === null ? null : readGridScrollPosition(scrollKey),
  )
  const pendingRestoreRef = useRef(restorePoint)
  const prevRowCountRef = useRef<number | null>(null)
  const rowCountRef = useRef(rowCount)

  useEffect(() => {
    rowCountRef.current = rowCount
  })

  // Rows arrive after mount on every page, so the restore has to wait for the first commit that
  // has any, and the virtualiser sizes the region a commit after that again — the first attempt
  // is always clamped short. Comparing the count rather than the row array is also what lets the
  // reset stay out of the way: the array is a new identity on every revalidation, which would
  // otherwise reset a reader who had only switched tabs and come back.
  useLayoutEffect(() => {
    const region = scrollRegionRef.current
    if (region === null) return
    const prevRowCount = prevRowCountRef.current
    const currRowCount = rowCount
    prevRowCountRef.current = currRowCount
    const pendingRestore = pendingRestoreRef.current
    if (pendingRestore !== null && pendingRestore.rowCount === currRowCount) {
      region.scrollTop = pendingRestore.top
      region.scrollLeft = pendingRestore.left
      // Rows are placed by arithmetic, so the first commit where the region overflows at all is
      // the one where it has its full height. Before that the offset clamps to nothing and has
      // to be retried; from that commit on it has landed.
      if (region.scrollHeight > region.clientHeight) pendingRestoreRef.current = null
      return
    }
    // Still waiting for the rows this offset was taken against.
    if (currRowCount === 0) return
    pendingRestoreRef.current = null
    if (prevRowCount === currRowCount) return
    region.scrollTop = 0
    // Recorded, not just applied: a result set the reader never scrolls leaves no scroll event
    // behind, and the stored offset would otherwise still describe the set before this one.
    if (scrollKey !== null) {
      writeGridScrollPosition(scrollKey, { top: 0, left: 0, rowCount: currRowCount })
    }
  })

  useEffect(() => {
    const region = scrollRegionRef.current
    if (region === null || scrollKey === null) return
    let frame = 0
    const handleScroll = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        // An empty result set clamps the region to the top, and a pending restore has not
        // applied its offset yet. Writing in either case would erase what we came back for.
        const currRowCount = rowCountRef.current
        if (currRowCount === 0 || pendingRestoreRef.current !== null) return
        writeGridScrollPosition(scrollKey, {
          top: region.scrollTop,
          left: region.scrollLeft,
          rowCount: currRowCount,
        })
      })
    }
    region.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      region.removeEventListener('scroll', handleScroll)
    }
  }, [scrollKey, scrollRegionRef])

  return { initialOffset: restorePoint?.top ?? 0 }
}
