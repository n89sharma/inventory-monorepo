import express from 'express'
import { globalSearch, GlobalSearchQuerySchema } from '../controllers/searchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', requirePermission('view_asset'), validateQuery(GlobalSearchQuerySchema), globalSearch)

export default router
