import express from 'express';
import { body } from 'express-validator';
import {
  getGroups,
  getAllGroups,
  getGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  updateMemberRole,
  removeMember,
} from '../controllers/groupController.js';
import { authenticate } from '../middleware/auth.js';
import { isGroupMember, isGroupOwnerOrAdmin } from '../middleware/groupAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
];

// Routes
router.get('/', getGroups); // Get user's groups
router.get('/all', getAllGroups); // Get all groups for discovery
router.get('/:id', getGroup);
router.post('/', createGroupValidation, createGroup);
router.post('/:groupId/join', joinGroup);
router.post('/:groupId/leave', leaveGroup);
router.patch('/:groupId/members/:userId/role', isGroupOwnerOrAdmin, updateMemberRole);
router.delete('/:groupId/members/:userId', isGroupOwnerOrAdmin, removeMember);

export default router;

