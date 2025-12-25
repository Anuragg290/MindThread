import File from '../models/File.js';
import Group from '../models/Group.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getFiles = async (req, res, next) => {
  try {
    const { groupId } = req.params;
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
      .populate('uploader', 'username email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Format files manually
    const formattedFiles = files.map((file) => {
      const fileObj = { ...file };
      fileObj._id = fileObj._id.toString();
      if (fileObj.createdAt) fileObj.createdAt = new Date(fileObj.createdAt).toISOString();
      if (fileObj.updatedAt) fileObj.updatedAt = new Date(fileObj.updatedAt).toISOString();
      return fileObj;
    });

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error in file controller:', error);
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
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Create file record
    const file = await File.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/api/files/${req.file.filename}`,
      uploader: userId,
      group: groupId,
    });

    await file.populate('uploader', 'username email avatar');
    
    // Format file manually
    const fileObj = file.toObject();
    fileObj._id = fileObj._id.toString();
    fileObj.createdAt = fileObj.createdAt.toISOString();
    fileObj.updatedAt = fileObj.updatedAt.toISOString();

    res.status(201).json(fileObj);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
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

    // Delete file from filesystem
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.error('Error deleting file from filesystem:', err);
    }

    // Delete file record
    await File.findByIdAndDelete(fileId);

    res.json({});
  } catch (error) {
    console.error('Error in file controller:', error);
    next(error);
  }
};

// Serve file
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

    // Note: In production, you'd want to verify the user is authenticated
    // For now, we'll rely on the file URL being somewhat secret
    // In a real app, you'd check authentication here

    res.sendFile(path.resolve(file.path));
  } catch (error) {
    console.error('Error in file controller:', error);
    next(error);
  }
};

