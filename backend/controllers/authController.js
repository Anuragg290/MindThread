import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { validationResult } from 'express-validator';
import { cloudinary } from '../config/cloudinary.js';

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        institution: user.institution,
        academicYear: user.academicYear,
        major: user.major,
        bio: user.bio,
        interests: user.interests || [],
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        institution: user.institution,
        academicYear: user.academicYear,
        major: user.major,
        bio: user.bio,
        interests: user.interests || [],
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      institution: user.institution,
      academicYear: user.academicYear,
      major: user.major,
      bio: user.bio,
      interests: user.interests || [],
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { username, institution, academicYear, major, bio, interests } = req.body;
    const userId = req.user._id.toString();

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (institution !== undefined) updateData.institution = institution;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (major !== undefined) updateData.major = major;
    if (bio !== undefined) updateData.bio = bio;
    if (interests !== undefined) updateData.interests = interests;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      institution: user.institution,
      academicYear: user.academicYear,
      major: user.major,
      bio: user.bio,
      interests: user.interests || [],
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get Cloudinary URL
    let cloudinaryUrl = req.file.secure_url || req.file.url || req.file.path;
    
    if (!cloudinaryUrl && req.file.public_id) {
      try {
        const resource = await cloudinary.api.resource(req.file.public_id, {
          resource_type: 'image',
          type: 'upload',
        });
        cloudinaryUrl = resource.secure_url || resource.url;
      } catch (apiError) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (cloudName) {
          cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${req.file.public_id}`;
        }
      }
    }

    if (!cloudinaryUrl) {
      if (req.file?.public_id) {
        await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'image' }).catch(() => {});
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to get image URL from Cloudinary',
      });
    }

    // Delete old avatar from Cloudinary if exists
    const oldUser = await User.findById(userId);
    if (oldUser?.avatar) {
      try {
        // Extract public_id from old avatar URL
        const oldUrl = oldUser.avatar;
        const publicIdMatch = oldUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (publicIdMatch) {
          const oldPublicId = publicIdMatch[1];
          await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'image' }).catch(() => {});
        }
      } catch (error) {
        console.error('Error deleting old avatar:', error);
      }
    }

    // Update user avatar
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: cloudinaryUrl } },
      { new: true }
    ).select('-password');

    res.json({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      institution: user.institution,
      academicYear: user.academicYear,
      major: user.major,
      bio: user.bio,
      interests: user.interests || [],
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    // Clean up uploaded file from Cloudinary on error
    if (req.file?.public_id) {
      await cloudinary.uploader.destroy(req.file.public_id, { resource_type: 'image' }).catch(() => {});
    }
    next(error);
  }
};

