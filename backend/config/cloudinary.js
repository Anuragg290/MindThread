// Cloudinary configuration - REQUIRED for file uploads
// 🔥 CRITICAL: Load dotenv FIRST before checking env vars
// This ensures .env is loaded even if this module is imported before server.js loads dotenv
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory where this file is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory explicitly
const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to default behavior
  dotenv.config();
}

let cloudinary, CloudinaryStorage, cloudinaryStorage;

try {
  // Import Cloudinary packages
  const cloudinaryModule = await import('cloudinary');
  const storageModule = await import('multer-storage-cloudinary');
  
  cloudinary = cloudinaryModule.v2;
  CloudinaryStorage = storageModule.CloudinaryStorage;
} catch (error) {
  console.error('❌ Cloudinary packages not installed!');
  console.error('   Run: npm install cloudinary multer-storage-cloudinary');
  console.error('   Error:', error.message);
  throw new Error('Cloudinary packages are required. Please install: npm install cloudinary multer-storage-cloudinary');
}

// Validate environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Cloudinary configuration missing!');
  console.error('   Please add to backend/.env:');
  console.error('   CLOUDINARY_CLOUD_NAME=your-cloud-name');
  console.error('   CLOUDINARY_API_KEY=your-api-key');
  console.error('   CLOUDINARY_API_SECRET=your-api-secret');
  console.error('');
  console.error('   Get credentials from: https://cloudinary.com/users/register/free');
  console.error('   Then go to Dashboard → Settings → Product Environment Credentials');
  console.error('');
  console.error('   Checked .env path:', envPath);
  console.error('   .env file exists:', existsSync(envPath));
  throw new Error('Cloudinary environment variables are not set. Please configure .env file.');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Create Cloudinary storage for Multer
// Using resource_type: 'raw' for PDF, DOCX, TXT files
cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return {
      folder: 'study-smart-ai', // Optional: organize files in a folder
      resource_type: 'raw', // Use 'raw' for PDF, DOCX, TXT files
      public_id: publicId, // Unique filename
      // Preserve original filename in metadata
      context: {
        originalName: file.originalname,
      },
    };
  },
});

console.log('✅ Cloudinary configured successfully');

// Export cloudinary instance for direct operations (delete, etc.)
export { cloudinary, cloudinaryStorage };

