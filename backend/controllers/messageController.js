import Message from '../models/Message.js';
import Group from '../models/Group.js';
import { validationResult } from 'express-validator';

export const getMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const userId = req.user._id.toString();
    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get messages
    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Message.countDocuments({ group: groupId });
    const hasMore = skip + messages.length < total;

    // Reverse to show oldest first (for chat UI)
    messages.reverse();

    res.json({
      data: messages,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('Error in message controller:', error);
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Create message
    const message = await Message.create({
      content,
      sender: userId,
      group: groupId,
    });

    await message.populate('sender', 'username email avatar');
    
    // Format message manually
    const messageObj = message.toObject();
    messageObj._id = messageObj._id.toString();
    messageObj.createdAt = messageObj.createdAt.toISOString();
    messageObj.updatedAt = messageObj.updatedAt.toISOString();

    res.status(201).json(messageObj);
  } catch (error) {
    console.error('Error in message controller:', error);
    next(error);
  }
};

