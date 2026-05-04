import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { PasswordResetController } from '../controllers/PasswordResetController.js';

const router = express.Router();

router.post('/login', AuthController.login);
router.post('/forgot-password', PasswordResetController.forgotPassword);
router.post('/reset-password', PasswordResetController.resetPassword);

export default router;
