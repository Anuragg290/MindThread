import express from 'express';
import { body } from 'express-validator';
import { getMessages, sendMessage } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { isGroupMember } from '../middleware/groupAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const sendMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
];

// Routes
router.get('/:groupId/messages', isGroupMember, getMessages);
router.post('/:groupId/messages', isGroupMember, sendMessageValidation, sendMessage);

export default router;

