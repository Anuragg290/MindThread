import multer from 'multer';
import { cloudinaryStorage } from '../config/cloudinary.js';

// CRITICAL: Use Cloudinary storage instead of disk storage
// Files are uploaded directly to Cloudinary, not saved locally
const storage = cloudinaryStorage;

// File filter
const fileFilter = (req, file, cb) => {
  // Allow PDF, DOCX, and TXT files
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

