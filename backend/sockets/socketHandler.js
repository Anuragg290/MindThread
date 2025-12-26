import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Group from '../models/Group.js';

export const setupSocketIO = (io) => {
  /* =====================================================
     Socket Authentication Middleware
     ===================================================== */
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: No token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  /* =====================================================
     Socket Connection
     ===================================================== */
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.userId}`);

    /* ---------------------------------------------------
       Join Group Room
       --------------------------------------------------- */
    socket.on('join_group', async ({ groupId }) => {
      try {
        if (!groupId) {
          socket.emit('error', { message: 'Group ID required' });
          return;
        }

        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }

        const isMember = group.members.some(
          (m) => m.user.toString() === socket.userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'Not a group member' });
          return;
        }

        // Leave previous room
        if (socket.currentGroupId) {
          socket.leave(`group:${socket.currentGroupId}`);
        }

        // Join new room
        socket.join(`group:${groupId}`);
        socket.currentGroupId = groupId;

        socket.emit('joined_group', { groupId });

        socket.to(`group:${groupId}`).emit('notification', {
          userId: socket.userId,
          username: socket.user.username,
          action: 'join',
        });

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /* ---------------------------------------------------
       Leave Group Room
       --------------------------------------------------- */
    socket.on('leave_group', ({ groupId }) => {
      if (groupId && socket.currentGroupId === groupId) {
        socket.leave(`group:${groupId}`);
        socket.currentGroupId = null;

        socket.emit('left_group', { groupId });

        socket.to(`group:${groupId}`).emit('notification', {
          userId: socket.userId,
          username: socket.user.username,
          action: 'leave',
        });
      }
    });

    /* ---------------------------------------------------
       Typing Indicator
       --------------------------------------------------- */
    socket.on('typing', ({ groupId, isTyping }) => {
      if (socket.currentGroupId === groupId) {
        socket.to(`group:${groupId}`).emit('typing', {
          userId: socket.userId,
          username: socket.user.username,
          isTyping,
        });
      }
    });

    /* ---------------------------------------------------
       IMPORTANT: NO MESSAGE CREATION HERE ❌
       ---------------------------------------------------
       Messages MUST be created in REST API
       REST API will emit:
         io.to(`group:${groupId}`).emit('message:new', message)
       --------------------------------------------------- */

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.userId}`);

      if (socket.currentGroupId) {
        socket.to(`group:${socket.currentGroupId}`).emit('notification', {
          userId: socket.userId,
          username: socket.user.username,
          action: 'leave',
        });
      }
    });
  });
};
