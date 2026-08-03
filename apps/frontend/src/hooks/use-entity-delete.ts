import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function useEntityDelete(
  label: string,
  entityId: string,
  remove: (entityId: string) => Promise<void>,
): () => Promise<void> {
  const navigate = useNavigate()

  return useCallback(async () => {
    try {
      await remove(entityId)
    } catch {
      return
    }
    toast.success(`${label} ${entityId} deleted`, { position: 'top-center' })
    navigate('..', { relative: 'path' })
  }, [label, entityId, remove, navigate])
}
