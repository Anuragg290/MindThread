import express from 'express';
import { body } from 'express-validator';
import {
  getSummaries,
  generateChatSummary,
  generateDocumentSummary,
  deleteSummary,
} from '../controllers/summaryController.js';
import { authenticate } from '../middleware/auth.js';
import { isGroupMember } from '../middleware/groupAccess.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const generateDocumentSummaryValidation = [
  body('fileId')
    .notEmpty()
    .withMessage('File ID is required'),
];

// Routes
router.get('/:groupId/summaries', isGroupMember, getSummaries);
router.post('/:groupId/summaries/chat', isGroupMember, generateChatSummary);
router.post('/:groupId/summaries/document', isGroupMember, generateDocumentSummaryValidation, generateDocumentSummary);
router.delete('/:groupId/summaries/:summaryId', isGroupMember, deleteSummary);

export default router;

