import File from '../models/File.js';
import Group from '../models/Group.js';
import { cloudinary } from '../config/cloudinary.js';

export const getFiles = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    // Validate groupId format
    if (!groupId || !/^[0-9a-fA-F]{24}$/.test(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format',
      });
    }
    
    const userId = req.user._id.toString();

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    const files = await File.find({ group: groupId })
      .populate({
        path: 'uploader',
        select: 'username email avatar',
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Format files manually
    const formattedFiles = files.map((file) => {
      try {
        const fileObj = { ...file };
        fileObj._id = fileObj._id.toString();
        if (fileObj.createdAt) {
          fileObj.createdAt = new Date(fileObj.createdAt).toISOString();
        }
        if (fileObj.updatedAt) {
          fileObj.updatedAt = new Date(fileObj.updatedAt).toISOString();
        }
        return fileObj;
      } catch (formatError) {
        console.error('Error formatting file:', formatError, file);
        // Return file with basic formatting if date formatting fails
        return {
          ...file,
          _id: file._id?.toString() || file._id,
          createdAt: file.createdAt || new Date().toISOString(),
          updatedAt: file.updatedAt || new Date().toISOString(),
        };
      }
    });

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error in getFiles controller:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

export const uploadFile = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      // Clean up uploaded file from Cloudinary
      if (req.file?.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' }).catch(() => {});
      }
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      // Clean up uploaded file from Cloudinary
      if (req.file?.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' }).catch(() => {});
      }
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Debug: Log what we received from Cloudinary
    console.log('📦 req.file from Cloudinary:', {
      public_id: req.file.public_id,
      url: req.file.url,
      secure_url: req.file.secure_url,
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      allKeys: Object.keys(req.file),
    });

    // CRITICAL: Cloudinary provides secure_url or url in req.file
    // Use secure_url for HTTPS or url for HTTP
    let cloudinaryUrl = req.file.secure_url || req.file.url || req.file.path;
    
    // If URL is not directly available, try to get it from Cloudinary API
    if (!cloudinaryUrl && req.file.public_id) {
      try {
        // Try to get the resource info from Cloudinary
        const resource = await cloudinary.api.resource(req.file.public_id, {
          resource_type: 'raw',
          type: 'upload',
        });
        cloudinaryUrl = resource.secure_url || resource.url;
        console.log('🔧 Fetched Cloudinary URL from API:', cloudinaryUrl);
      } catch (apiError) {
        console.warn('⚠️ Could not fetch URL from Cloudinary API, constructing manually:', apiError.message);
        // Fallback: Construct URL manually
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (cloudName) {
          // Construct Cloudinary URL manually
          // Format: https://res.cloudinary.com/{cloud_name}/raw/upload/{folder}/{public_id}
          const folder = 'mindthread';
          cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${folder}/${req.file.public_id}`;
          console.log('🔧 Constructed Cloudinary URL manually:', cloudinaryUrl);
        }
      }
    }
    
    if (!cloudinaryUrl) {
      // Clean up uploaded file from Cloudinary
      if (req.file?.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' }).catch(() => {});
      }
      console.error('❌ Failed to get file URL from Cloudinary. req.file:', req.file);
      return res.status(500).json({
        success: false,
        message: 'Failed to get file URL from Cloudinary',
        debug: process.env.NODE_ENV !== 'production' ? {
          fileKeys: Object.keys(req.file || {}),
          public_id: req.file?.public_id,
        } : undefined,
      });
    }

    // Create file record
    // Store Cloudinary URL in both url and path fields for compatibility
    const file = await File.create({
      filename: req.file.public_id || req.file.filename, // Use Cloudinary public_id
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: cloudinaryUrl, // Store Cloudinary URL in path field
      url: cloudinaryUrl, // Store Cloudinary URL in url field
      uploader: userId,
      group: groupId,
    });

    await file.populate('uploader', 'username email avatar');
    
    // Format file manually
    const fileObj = file.toObject();
    fileObj._id = fileObj._id.toString();
    fileObj.createdAt = fileObj.createdAt.toISOString();
    fileObj.updatedAt = fileObj.updatedAt.toISOString();

    // 🔥 EMIT SOCKET EVENT FOR FILE UPLOAD
    console.log('🔥 EMITTING SOCKET FILE:', fileObj._id);
    const io = req.app.get('io');
    if (io) {
      console.log('🔥 IO EXISTS?', !!io);
      io.to(`group:${groupId}`).emit('file:new', fileObj);
    } else {
      console.warn('⚠️ Socket.io instance not found in app');
    }

    res.status(201).json(fileObj);
  } catch (error) {
    // Clean up uploaded file from Cloudinary on error
    if (req.file?.public_id) {
      await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'raw' }).catch(() => {});
    }
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { groupId, fileId } = req.params;
    const userId = req.user._id.toString();

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'File does not belong to this group',
      });
    }

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Check if user is uploader, owner, or admin
    const isUploader = file.uploader.toString() === userId;
    const isOwner = group.owner.toString() === userId;
    const member = group.members.find((m) => m.user.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isUploader && !isOwner && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this file',
      });
    }

    // Delete file from Cloudinary
    // Extract public_id from Cloudinary URL or use filename
    try {
      let publicId = file.filename; // Default to filename (which should be public_id)
      
      // If file.url is a Cloudinary URL, extract public_id
      // Cloudinary URLs format: 
      // https://res.cloudinary.com/cloud_name/raw/upload/v123456789/mindthread/public_id
      // OR: https://res.cloudinary.com/cloud_name/raw/upload/v123456789/public_id
      if (file.url && file.url.includes('cloudinary.com')) {
        try {
          // Try to extract public_id from URL
          const urlParts = file.url.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          
          if (uploadIndex !== -1) {
            // Get everything after 'upload/v{version}/'
            // Format: ['res.cloudinary.com', 'cloud_name', 'raw', 'upload', 'v123456789', 'folder', 'public_id']
            const afterUpload = urlParts.slice(uploadIndex + 1); // Skip 'upload'
            // Skip version number (v123456789) and get rest
            if (afterUpload.length > 1) {
              publicId = afterUpload.slice(1).join('/'); // Get folder/public_id or just public_id
              // Remove file extension if present
              publicId = publicId.split('.')[0];
            }
          }
        } catch (parseError) {
          console.warn('Could not parse Cloudinary URL, using filename:', parseError);
          // Fallback to filename
          publicId = file.filename;
        }
      }
      
      // Delete from Cloudinary using public_id
      // Include folder path if it exists (e.g., 'mindthread/public_id')
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      console.log(`✅ Deleted file from Cloudinary: ${publicId}`);
    } catch (err) {
      console.error('Error deleting file from Cloudinary:', err);
      // Continue with database deletion even if Cloudinary deletion fails
      // (file might already be deleted or URL might be invalid)
    }

    // Delete file record
    await File.findByIdAndDelete(fileId);

    res.json({});
  } catch (error) {
    console.error('Error in file controller:', error);
    next(error);
  }
};

// Serve file (DEPRECATED - Files are now served directly from Cloudinary)
// This endpoint is kept for backward compatibility but redirects to Cloudinary URL
export const serveFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ filename });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Verify user is a member of the group
    const group = await Group.findById(file.group).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // CRITICAL: Redirect to Cloudinary URL instead of serving locally
    // Files are now stored in Cloudinary, so we redirect to the Cloudinary URL
    if (file.url && file.url.includes('cloudinary.com')) {
      return res.redirect(file.url);
    }
    
    // Fallback: If URL is not a Cloudinary URL, return it as JSON
    // (for backward compatibility with old files)
    return res.json({
      success: true,
      url: file.url,
      message: 'File is stored in Cloudinary. Use the URL directly.',
    });
  } catch (error) {
    console.error('Error in file controller:', error);
    next(error);
  }
};

