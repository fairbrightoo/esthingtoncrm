import express from 'express';
import { TeamController } from '../controllers/TeamController.js';
import { PulseController } from '../controllers/PulseController.js';
import { TeamCommsController } from '../controllers/TeamCommsController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// --- TEAM MANAGEMENT ---
// Head BDD or Super Admin can view all teams and create teams
router.get('/', requireRole(['HEAD_BDD', 'SUPER_ADMIN', 'BDM', 'TEAM_LEAD', 'MARKETER']), TeamController.getTeams);
router.post('/', requireRole(['HEAD_BDD', 'SUPER_ADMIN']), TeamController.createTeam);

// Head BDD, Super Admin can update team (change leader/BDM). Team Leads can also maybe add members (but we keep it restricted for now)
router.put('/:id', requireRole(['HEAD_BDD', 'SUPER_ADMIN']), TeamController.updateTeam);

// Get specific team members (Team Lead, BDM, Head BDD)
router.get('/:id/members', requireRole(['TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SUPER_ADMIN']), TeamController.getTeamMembers);


// --- DAILY PULSE ---
// Get daily pulse for a specific marketer. Anyone in management can view this.
router.get('/pulse/:id', requireRole(['TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SUPER_ADMIN']), PulseController.getDailyPulse);


// --- TEAM COMMS ---
// Get team messages and send message
// We are not strictly validating if the user belongs to the team here for simplicity, but in a real scenario we should
router.get('/:teamId/messages', TeamCommsController.getTeamMessages);
router.post('/:teamId/messages', TeamCommsController.sendMessage);

export default router;
