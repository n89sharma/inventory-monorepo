import express from 'express'
import { createModel, getModels } from '../controllers/modelController.js'

const router = express.Router()

router.get('/', getModels)
router.post('/', createModel)

export default router