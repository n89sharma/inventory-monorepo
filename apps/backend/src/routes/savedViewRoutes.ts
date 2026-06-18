import express from 'express'
import {
  createSavedView,
  deleteSavedView,
  getSavedViews,
} from '../controllers/savedViewController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getSavedViews)
router.post('/', createSavedView)
router.delete('/:id', deleteSavedView)

export default router
