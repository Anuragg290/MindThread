import Group from '../models/Group.js';

// Check if user is a member of the group
export const isGroupMember = async (req, res, next) => {
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

    const isMember = group.members.some(
      (member) => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    req.group = group;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check if user is owner or admin of the group
export const isGroupOwnerOrAdmin = async (req, res, next) => {
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

    const member = group.members.find(
      (m) => m.user.toString() === userId
    );

    const isOwner = group.owner.toString() === userId;
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';
    const isSystemAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    req.group = group;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

