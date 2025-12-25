import mongoose from 'mongoose';

const messageRangeSchema = new mongoose.Schema({
  from: String,
  to: String,
  count: Number,
});

const summarySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['chat', 'document'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    keyTopics: {
      type: [String],
      default: [],
    },
    actionItems: {
      type: [String],
      default: [],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    messageRange: {
      type: messageRangeSchema,
      default: null,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret._id = ret._id.toString();
        ret.createdAt = ret.createdAt.toISOString();
        ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
      },
    },
  }
);

export default mongoose.model('Summary', summarySchema);

