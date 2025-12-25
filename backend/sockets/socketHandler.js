import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';

export const setupSocketIO = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join group room
    socket.on('join_group', async (data) => {
      try {
        const { groupId } = data;
        
        if (!groupId) {
          socket.emit('error', { message: 'Group ID is required' });
          return;
        }

        // Verify user is a member of the group
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }

        const isMember = group.members.some(
          (member) => member.user.toString() === socket.userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'You are not a member of this group' });
          return;
        }

        // Leave previous group room if any
        if (socket.currentGroupId) {
          socket.leave(`group:${socket.currentGroupId}`);
        }

        // Join new group room
        socket.join(`group:${groupId}`);
        socket.currentGroupId = groupId;

        // Notify others in the group
        socket.to(`group:${groupId}`).emit('notification', {
          userId: socket.userId,
          username: socket.user.username,
          action: 'join',
        });

        socket.emit('joined_group', { groupId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave group room
    socket.on('leave_group', async (data) => {
      try {
        const { groupId } = data;
        
        if (groupId && socket.currentGroupId === groupId) {
          socket.leave(`group:${groupId}`);
          
          // Notify others in the group
          socket.to(`group:${groupId}`).emit('notification', {
            userId: socket.userId,
            username: socket.user.username,
            action: 'leave',
          });

          socket.currentGroupId = null;
          socket.emit('left_group', { groupId });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { groupId, content } = data;

        if (!groupId || !content) {
          socket.emit('error', { message: 'Group ID and content are required' });
          return;
        }

        // Verify user is a member of the group
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }

        const isMember = group.members.some(
          (member) => member.user.toString() === socket.userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'You are not a member of this group' });
          return;
        }

        // Create message in database
        const message = await Message.create({
          content: content.trim(),
          sender: socket.userId,
          group: groupId,
        });

        await message.populate('sender', 'username email avatar');

        // Broadcast message to all users in the group
        io.to(`group:${groupId}`).emit('message', message);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      try {
        const { groupId, isTyping } = data;

        if (!groupId) {
          return;
        }

        // Verify user is in the group room
        if (socket.currentGroupId === groupId) {
          socket.to(`group:${groupId}`).emit('typing', {
            userId: socket.userId,
            username: socket.user.username,
            isTyping,
          });
        }
      } catch (error) {
        console.error('Typing error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      if (socket.currentGroupId) {
        socket.to(`group:${socket.currentGroupId}`).emit('notification', {
          userId: socket.userId,
          username: socket.user?.username || 'User',
          action: 'leave',
        });
      }
    });
  });
};

