import express from 'express';
import { HRWorkflowController } from '../controllers/HRWorkflowController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Ensure all routes are protected

// 1. Leave Management
router.post('/leaves', HRWorkflowController.applyLeave);
router.get('/leaves/my-leaves', HRWorkflowController.getMyLeaves);
router.get('/leaves/branch-leaves', HRWorkflowController.getBranchLeaves); // For HR
router.get('/leaves/company-leaves', HRWorkflowController.getAllCompanyLeaves); // For MD
router.put('/leaves/:leaveId/vet', HRWorkflowController.vetLeaveAsHR);
router.put('/leaves/:leaveId/approve', HRWorkflowController.approveLeaveAsMD);

// 2. Queries & Disciplinary
router.post('/queries', HRWorkflowController.issueQuery);
router.get('/queries/my-queries', HRWorkflowController.getMyQueries);
router.get('/queries/branch-queries', HRWorkflowController.getBranchQueries);
router.put('/queries/:queryId/reply', HRWorkflowController.replyToQuery);
router.put('/queries/:queryId/resolve', HRWorkflowController.resolveQuery);

// 3. Appraisals
router.post('/appraisals', HRWorkflowController.createAppraisal);
router.get('/appraisals/my-appraisals', HRWorkflowController.getMyAppraisals);
router.get('/appraisals/branch-appraisals', HRWorkflowController.getBranchAppraisals);

// Awards
router.post('/awards', HRWorkflowController.awardBestStaff);
router.get('/awards', HRWorkflowController.getBranchAwards);

// 4. Document Hub
router.post('/documents', upload.single('file'), HRWorkflowController.uploadCompanyDocument);
router.get('/documents', HRWorkflowController.getCompanyDocuments);
router.delete('/documents/:id', HRWorkflowController.deleteCompanyDocument);

export default router;
