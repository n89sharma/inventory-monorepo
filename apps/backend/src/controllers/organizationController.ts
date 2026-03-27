import { Request, Response } from 'express'
import { getOrganizations as getOrganizationsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getOrganizations(req: Request, res: Response) {
  try {
    const orgs = await prisma.$queryRawTyped(getOrganizationsDb())
    res.json(orgs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orgs' })
  }
}