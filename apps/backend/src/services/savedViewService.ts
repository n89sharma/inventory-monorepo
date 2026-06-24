import { CreateSavedView, SavedViewPageKey, SavedViewSummary } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const SAVED_VIEW_SUMMARY_SELECT = {
  id: true,
  name: true,
  page_key: true,
  query_string: true,
  created_at: true,
} as const

export async function listSavedViews(
  userId: number,
  pageKey: SavedViewPageKey,
): Promise<SavedViewSummary[]> {
  const views = await prisma.savedView.findMany({
    where: { created_by_id: userId, page_key: pageKey },
    orderBy: { created_at: 'desc' },
    select: SAVED_VIEW_SUMMARY_SELECT,
  })
  return views as SavedViewSummary[]
}

export async function createSavedView(
  userId: number,
  body: CreateSavedView,
): Promise<{ id: number }> {
  try {
    const view = await prisma.savedView.create({
      data: { ...body, created_by_id: userId },
      select: { id: true },
    })
    return { id: view.id }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('A view with that name already exists')
    }
    throw error
  }
}

export async function deleteSavedView(userId: number, id: number): Promise<void> {
  const { count } = await prisma.savedView.deleteMany({
    where: { id, created_by_id: userId },
  })
  if (count === 0) {
    throw new NotFoundError('Saved view not found')
  }
}
