import express from 'express';
import multer from 'multer';
import { CompanyController } from '../controllers/CompanyController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AttendanceController } from '../controllers/AttendanceController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { ICTController } from '../controllers/ICTController.js';
import { TaskController } from '../controllers/TaskController.js';
const router = express.Router();

router.get('/', CompanyController.getAllCompanies);
router.get('/:companyId/branches', CompanyController.getBranchesByCompany);
router.get('/:id/whatsapp-templates', CompanyController.getWhatsAppTemplates);
router.get('/:companyId/branches/:branchId/users', CompanyController.getBranchUsers);

// Protected Admin Routes
router.post('/bulk-admins', authenticateToken, upload.single('file'), CompanyController.bulkCreateAdmins);
router.post('/', authenticateToken, upload.single('logo'), CompanyController.createCompany);
router.put('/:id', authenticateToken, upload.single('logo'), CompanyController.updateCompany);
router.delete('/:id', authenticateToken, CompanyController.deleteCompany);

router.post('/:id/branches', authenticateToken, CompanyController.createBranch);
router.put('/branches/:id', authenticateToken, upload.single('signature'), CompanyController.updateBranch);
router.delete('/branches/:id', authenticateToken, CompanyController.deleteBranch);

// Branch Admin Management
router.get('/:id/group-md', authenticateToken, CompanyController.getGroupMDs);
router.post('/:id/group-md', authenticateToken, CompanyController.createGroupMD);
router.post('/:companyId/branches/:branchId/admins', authenticateToken, CompanyController.createBranchAdmin);
router.post('/:companyId/branches/:branchId/mds', authenticateToken, CompanyController.createBranchMD);
router.post('/:companyId/branches/:branchId/users', authenticateToken, CompanyController.createBranchStaff);
router.post('/:companyId/branches/:branchId/users/bulk', authenticateToken, upload.single('file'), CompanyController.bulkCreateBranchStaff);

// Attendance Routes
router.post('/:companyId/branches/:branchId/attendance', authenticateToken, AttendanceController.markAttendance);
router.get('/:companyId/branches/:branchId/attendance', authenticateToken, AttendanceController.getBranchAttendance);
router.get('/:companyId/branches/:branchId/payroll', authenticateToken, AttendanceController.getBranchPayroll);
router.post('/users/:id/documents', authenticateToken, upload.single('file'), CompanyController.uploadStaffDocument);
router.delete('/users/:id/documents/:documentType', authenticateToken, CompanyController.deleteStaffDocument);
router.put('/users/:id', authenticateToken, CompanyController.updateUser);
router.delete('/users/:id', authenticateToken, CompanyController.deleteUser);

// ICT Oracle & Site Expert Routes
router.get('/:companyId/branches/:branchId/assets', authenticateToken, ICTController.getAssets);
router.post('/:companyId/branches/:branchId/assets', authenticateToken, upload.single('file'), ICTController.createAsset);
router.delete('/:companyId/branches/:branchId/assets/:assetId', authenticateToken, ICTController.deleteAsset);

router.get('/:companyId/branches/:branchId/scripts', authenticateToken, ICTController.getScripts);
router.post('/:companyId/branches/:branchId/scripts', authenticateToken, ICTController.createScript);
router.delete('/:companyId/branches/:branchId/scripts/:scriptId', authenticateToken, ICTController.deleteScript);

router.get('/:companyId/branches/:branchId/social-reports', authenticateToken, ICTController.getSocialReports);
router.post('/:companyId/branches/:branchId/social-reports', authenticateToken, ICTController.createSocialReport);

router.get('/:companyId/branches/:branchId/tasks/inspections', authenticateToken, TaskController.getBranchInspections);

export default router;
