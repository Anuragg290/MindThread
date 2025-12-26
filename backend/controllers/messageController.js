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
    const { content, replyTo } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    // ✅ SINGLE SOURCE OF TRUTH
    const message = await Message.create({
      content,
      sender: userId,
      group: groupId,
      replyTo: replyTo || null,
    });

    await message.populate('sender', 'username email avatar');

    const messageObj = message.toObject();

    // 🔥 EMIT SOCKET EVENT FROM HERE
    console.log('🔥 EMITTING SOCKET MESSAGE:', messageObj._id);
    const io = req.app.get('io');
    console.log('🔥 IO EXISTS?', !!io);
    io.to(`group:${groupId}`).emit('message:new', messageObj);

    res.status(201).json(messageObj);
  } catch (error) {
    next(error);
  }
};

// 🔥 TIER 2: Toggle reaction on message
export const toggleReaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { groupId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    // Verify user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(
      (member) => member.user.toString() === userId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    // Find the message
    const message = await Message.findOne({ _id: messageId, group: groupId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Initialize reactions array if it doesn't exist
    if (!message.reactions) {
      message.reactions = [];
    }

    // Find existing reaction for this emoji
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      // Toggle: remove user if already reacted, add if not
      const userIndex = existingReaction.users.findIndex(
        id => id.toString() === userId.toString()
      );
      
      if (userIndex > -1) {
        // Remove user from reaction
        existingReaction.users.splice(userIndex, 1);
        // Remove reaction entirely if no users left
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add user to reaction
        existingReaction.users.push(userId);
      }
    } else {
      // Create new reaction
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    await message.populate('sender', 'username email avatar');
    await message.populate('reactions.users', 'username');

    const messageObj = message.toObject();

    // 🔥 EMIT SOCKET EVENT FOR REACTION UPDATE
    const io = req.app.get('io');
    io.to(`group:${groupId}`).emit('reaction:update', {
      messageId: messageId,
      message: messageObj,
    });

    res.json({
      success: true,
      data: messageObj,
    });
  } catch (error) {
    next(error);
  }
};


