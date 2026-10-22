import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { ImprestController } from '../controllers/ImprestController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', ImprestController.createImprest);
router.get('/', ImprestController.getImprests);
router.get('/last-closing-balance', ImprestController.getLastClosingBalance);
router.get('/:id', ImprestController.getImprestById);
router.put('/:id', ImprestController.updateImprest);
router.put('/:id/approve', ImprestController.approveImprest);
router.put('/:id/disburse', ImprestController.disburseImprest);
router.put('/:id/reject', ImprestController.rejectImprest);
router.delete('/:id', ImprestController.deleteImprest);

export default router;
