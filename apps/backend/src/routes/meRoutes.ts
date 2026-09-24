import express from 'express'
import { updateLastSeenRelease } from '../controllers/meController.js'
import { getMyPermissions } from '../controllers/roleController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/permissions', getMyPermissions)
router.patch('/last-seen-release', updateLastSeenRelease)

export default router
