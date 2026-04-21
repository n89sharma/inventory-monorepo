import express from 'express'
import { createOrganization, getOrganizations } from '../controllers/organizationController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getOrganizations)
router.post('/', createOrganization)

export default router