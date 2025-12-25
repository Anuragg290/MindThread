import express from 'express';
import { getFiles, uploadFile, deleteFile } from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import { isGroupMember } from '../middleware/groupAccess.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/:groupId/files', isGroupMember, getFiles);
router.post('/:groupId/files', isGroupMember, upload.single('file'), uploadFile);
router.delete('/:groupId/files/:fileId', isGroupMember, deleteFile);

export default router;

