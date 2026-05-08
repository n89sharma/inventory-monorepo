import { AsyncLocalStorage } from 'async_hooks'

interface RequestContext {
  requestId: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()
