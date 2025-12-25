import Group from '../models/Group.js';
import { validationResult } from 'express-validator';

export const getGroups = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    
    const groups = await Group.find({
      'members.user': userId,
    })
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .sort({ updatedAt: -1 })
      .lean();

    // Format groups manually to avoid transform issues
    const formattedGroups = groups.map((group) => {
      const groupObj = { ...group };
      groupObj._id = groupObj._id.toString();
      if (groupObj.createdAt) groupObj.createdAt = new Date(groupObj.createdAt).toISOString();
      if (groupObj.updatedAt) groupObj.updatedAt = new Date(groupObj.updatedAt).toISOString();
      if (groupObj.members) {
        groupObj.members = groupObj.members.map((member) => ({
          ...member,
          user: member.user,
          joinedAt: member.joinedAt 
            ? (member.joinedAt instanceof Date 
                ? member.joinedAt.toISOString() 
                : new Date(member.joinedAt).toISOString())
            : new Date().toISOString(),
        }));
      }
      return groupObj;
    });

    res.json(formattedGroups);
  } catch (error) {
    console.error('Error getting groups:', error);
    next(error);
  }
};

export const getAllGroups = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    
    // Get all groups
    const allGroups = await Group.find()
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .sort({ updatedAt: -1 })
      .lean();

    // Format groups manually
    const formattedGroups = allGroups.map((group) => {
      const groupObj = { ...group };
      groupObj._id = groupObj._id.toString();
      if (groupObj.createdAt) groupObj.createdAt = new Date(groupObj.createdAt).toISOString();
      if (groupObj.updatedAt) groupObj.updatedAt = new Date(groupObj.updatedAt).toISOString();
      if (groupObj.members) {
        groupObj.members = groupObj.members.map((member) => ({
          ...member,
          user: member.user,
          joinedAt: member.joinedAt 
            ? (member.joinedAt instanceof Date 
                ? member.joinedAt.toISOString() 
                : new Date(member.joinedAt).toISOString())
            : new Date().toISOString(),
        }));
      }
      // Add a flag to indicate if user is a member
      groupObj.isMember = groupObj.members.some(
        (member) => member.user.toString() === userId
      );
      return groupObj;
    });

    res.json(formattedGroups);
  } catch (error) {
    console.error('Error getting all groups:', error);
    next(error);
  }
};

export const getGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const group = await Group.findById(id)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Format group manually
    const groupObj = { ...group };
    groupObj._id = groupObj._id.toString();
    if (groupObj.createdAt) groupObj.createdAt = new Date(groupObj.createdAt).toISOString();
    if (groupObj.updatedAt) groupObj.updatedAt = new Date(groupObj.updatedAt).toISOString();
    if (groupObj.members) {
      groupObj.members = groupObj.members.map((member) => ({
        ...member,
        user: member.user,
        joinedAt: member.joinedAt 
          ? (member.joinedAt instanceof Date 
              ? member.joinedAt.toISOString() 
              : new Date(member.joinedAt).toISOString())
          : new Date().toISOString(),
      }));
    }

    res.json(groupObj);
  } catch (error) {
    console.error('Error getting group:', error);
    next(error);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, description } = req.body;
    const userId = req.user._id;

    const group = await Group.create({
      name,
      description: description || '',
      owner: userId,
    });

    // Populate and convert to plain object to avoid transform issues
    await group.populate('owner', 'username email avatar');
    await group.populate('members.user', 'username email avatar');
    
    // Convert to plain object and format manually
    const groupObj = group.toObject();
    groupObj._id = groupObj._id.toString();
    groupObj.createdAt = groupObj.createdAt.toISOString();
    groupObj.updatedAt = groupObj.updatedAt.toISOString();
    if (groupObj.members) {
      groupObj.members = groupObj.members.map((member) => ({
        ...member,
        user: member.user,
        joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString() : new Date().toISOString(),
      }));
    }

    res.status(201).json(groupObj);
  } catch (error) {
    console.error('Error creating group:', error);
    next(error);
  }
};

export const joinGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if already a member
    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group',
      });
    }

    // Add user as member
    group.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date(),
    });

    await group.save();
    await group.populate('owner', 'username email avatar');
    await group.populate('members.user', 'username email avatar');
    
    // Format group manually
    const groupObj = group.toObject();
    groupObj._id = groupObj._id.toString();
    groupObj.createdAt = groupObj.createdAt.toISOString();
    groupObj.updatedAt = groupObj.updatedAt.toISOString();
    if (groupObj.members) {
      groupObj.members = groupObj.members.map((member) => ({
        ...member,
        user: member.user,
        joinedAt: member.joinedAt 
          ? (member.joinedAt instanceof Date 
              ? member.joinedAt.toISOString() 
              : new Date(member.joinedAt).toISOString())
          : new Date().toISOString(),
      }));
    }

    res.json(groupObj);
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is the owner
    if (group.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Group owner cannot leave the group',
      });
    }

    // Remove user from members
    group.members = group.members.filter(
      (member) => member.user.toString() !== userId
    );

    await group.save();

    res.json({});
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user._id.toString();

    if (!['admin', 'owner', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check permissions
    const currentMember = group.members.find(
      (m) => m.user.toString() === currentUserId
    );
    const isOwner = group.owner.toString() === currentUserId;
    const isAdmin = currentMember?.role === 'admin' || currentMember?.role === 'owner';

    if (!isOwner && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update member roles',
      });
    }

    // Cannot change owner's role
    if (group.owner.toString() === userId && role !== 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change owner role',
      });
    }

    // Update member role
    const member = group.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in group',
      });
    }

    member.role = role;
    await group.save();
    await group.populate('owner', 'username email avatar');
    await group.populate('members.user', 'username email avatar');
    
    // Format group manually
    const groupObj = group.toObject();
    groupObj._id = groupObj._id.toString();
    groupObj.createdAt = groupObj.createdAt.toISOString();
    groupObj.updatedAt = groupObj.updatedAt.toISOString();
    if (groupObj.members) {
      groupObj.members = groupObj.members.map((member) => ({
        ...member,
        user: member.user,
        joinedAt: member.joinedAt 
          ? (member.joinedAt instanceof Date 
              ? member.joinedAt.toISOString() 
              : new Date(member.joinedAt).toISOString())
          : new Date().toISOString(),
      }));
    }

    res.json(groupObj);
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Cannot remove owner
    if (group.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove group owner',
      });
    }

    // Check permissions
    const currentMember = group.members.find(
      (m) => m.user.toString() === currentUserId
    );
    const isOwner = group.owner.toString() === currentUserId;
    const isAdmin = currentMember?.role === 'admin' || currentMember?.role === 'owner';

    if (!isOwner && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove members',
      });
    }

    // Remove member
    group.members = group.members.filter(
      (member) => member.user.toString() !== userId
    );

    await group.save();

    res.json({});
  } catch (error) {
    next(error);
  }
};

