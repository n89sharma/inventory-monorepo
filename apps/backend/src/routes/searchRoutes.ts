import express from 'express'
import { globalSearch, GlobalSearchQuerySchema } from '../controllers/searchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', validateQuery(GlobalSearchQuerySchema), globalSearch)

export default router
