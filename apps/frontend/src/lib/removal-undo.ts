import { toast } from 'sonner'
import { mutate } from 'swr'

const UNDO_WINDOW_MS = 5000

type Pending = { timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }
const pendingRemovals = new Map<string, Pending>()

interface RemovalSpec<T> {
  collectionId: string
  detailCacheKey: string
  hideRemoved: (current: T) => T
  persist: () => Promise<void>
  label: string
}

function makeKey(collectionId: string, suffix: string): string {
  return `${collectionId}:${suffix}`
}

function buildUndo(key: string, detailCacheKey: string) {
  return () => {
    const pending = pendingRemovals.get(key)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRemovals.delete(key)
    mutate(detailCacheKey)
  }
}

export function scheduleRemoval<T>(spec: RemovalSpec<T>): void {
  const key = makeKey(spec.collectionId, `bulk:${Date.now()}`)

  mutate<T>(spec.detailCacheKey, (current) => (current ? spec.hideRemoved(current) : current), {
    revalidate: false,
  })

  const commit = async () => {
    pendingRemovals.delete(key)
    try {
      await spec.persist()
    } finally {
      mutate(spec.detailCacheKey)
    }
  }

  const timer = setTimeout(() => {
    void commit()
  }, UNDO_WINDOW_MS)
  pendingRemovals.set(key, { timer, commit })

  toast.success(spec.label, {
    position: 'top-center',
    duration: UNDO_WINDOW_MS,
    action: { label: 'Undo', onClick: buildUndo(key, spec.detailCacheKey) },
  })
}

export function flushPendingRemovals(collectionId: string): void {
  const prefix = `${collectionId}:`
  for (const [key, pending] of pendingRemovals) {
    if (!key.startsWith(prefix)) continue
    clearTimeout(pending.timer)
    // Intentional fire-and-forget: flush the pending commit without blocking unmount.
    // eslint-disable-next-line sonarjs/void-use
    void pending.commit()
  }
}
