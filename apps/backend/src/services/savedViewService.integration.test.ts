import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { createSavedView, deleteSavedView, listSavedViews } from './savedViewService.js'

const NON_OWNER_OFFSET = 99999

describe('savedViewService', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('creates a view and lists it for the owner and page', async () => {
    await createSavedView(refs.userId, {
      name: 'My View',
      page_key: 'search_all',
      query_string: '?q=1',
      column_ids: ['serial_number', 'status'],
    })

    const views = await listSavedViews(refs.userId, 'search_all')
    expect(views).toHaveLength(1)
    expect(views[0].name).toBe('My View')
    expect(views[0].column_ids).toEqual(['serial_number', 'status'])
  })

  it('rejects a duplicate name for the same user and page', async () => {
    await createSavedView(refs.userId, {
      name: 'Dup',
      page_key: 'search_all',
      query_string: '?a',
      column_ids: [],
    })

    await expect(
      createSavedView(refs.userId, {
        name: 'Dup',
        page_key: 'search_all',
        query_string: '?b',
        column_ids: [],
      }),
    ).rejects.toThrow(ConflictError)
  })

  it('scopes the list by page key', async () => {
    await createSavedView(refs.userId, {
      name: 'OnlyAll',
      page_key: 'search_all',
      query_string: '?a',
      column_ids: [],
    })

    const held = await listSavedViews(refs.userId, 'search_held')
    expect(held).toHaveLength(0)
  })

  it('only lets the owner delete a view', async () => {
    const { id } = await createSavedView(refs.userId, {
      name: 'ToDelete',
      page_key: 'search_all',
      query_string: '?a',
      column_ids: [],
    })

    await expect(deleteSavedView(refs.userId + NON_OWNER_OFFSET, id)).rejects.toThrow(NotFoundError)

    await deleteSavedView(refs.userId, id)
    const views = await listSavedViews(refs.userId, 'search_all')
    expect(views).toHaveLength(0)
  })
})
