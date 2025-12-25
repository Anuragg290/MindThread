import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'owner', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [groupMemberSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret._id = ret._id.toString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.members && Array.isArray(ret.members)) {
          ret.members = ret.members.map((member) => {
            const memberObj = member.toObject ? member.toObject() : member;
            return {
              ...memberObj,
              user: memberObj.user && typeof memberObj.user === 'object' && memberObj.user._id
                ? memberObj.user
                : (memberObj.user?.toString() || memberObj.user),
              joinedAt: memberObj.joinedAt 
                ? (memberObj.joinedAt instanceof Date 
                    ? memberObj.joinedAt.toISOString() 
                    : new Date(memberObj.joinedAt).toISOString())
                : new Date().toISOString(),
            };
          });
        }
        return ret;
      },
    },
  }
);

// Add owner as member with 'owner' role when group is created
groupSchema.pre('save', async function (next) {
  if (this.isNew) {
    const ownerExists = this.members.some(
      (m) => m.user.toString() === this.owner.toString()
    );
    if (!ownerExists) {
      this.members.push({
        user: this.owner,
        role: 'owner',
        joinedAt: new Date(),
      });
    }
  }
  next();
});

export default mongoose.model('Group', groupSchema);

