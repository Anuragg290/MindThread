import Summary from '../models/Summary.js';
import Message from '../models/Message.js';
import File from '../models/File.js';
import Group from '../models/Group.js';
import { generateSummary } from '../services/geminiService.js';
import { validationResult } from 'express-validator';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';

export const getSummaries = async (req, res, next) => {
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

    const summaries = await Summary.find({ group: groupId })
      .populate('generatedBy', 'username email avatar')
      .populate('sourceDocument', 'originalName filename')
      .sort({ createdAt: -1 })
      .lean();

    // Format summaries manually
    const formattedSummaries = summaries.map((summary) => {
      const summaryObj = { ...summary };
      summaryObj._id = summaryObj._id.toString();
      if (summaryObj.createdAt) summaryObj.createdAt = new Date(summaryObj.createdAt).toISOString();
      if (summaryObj.updatedAt) summaryObj.updatedAt = new Date(summaryObj.updatedAt).toISOString();
      if (summaryObj.messageRange) {
        summaryObj.messageRange = {
          ...summaryObj.messageRange,
          from: summaryObj.messageRange.from ? new Date(summaryObj.messageRange.from).toISOString() : null,
          to: summaryObj.messageRange.to ? new Date(summaryObj.messageRange.to).toISOString() : null,
        };
      }
      return summaryObj;
    });

    res.json(formattedSummaries);
  } catch (error) {
    console.error('Error in summary controller:', error);
    next(error);
  }
};

export const generateChatSummary = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { messageCount = 50 } = req.body;
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

    // Get recent messages
    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(messageCount)
      .lean();

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No messages found to summarize',
      });
    }

    // Reverse to get chronological order
    messages.reverse();

    // Format messages for Gemini
    const messagesText = messages
      .map((msg) => {
        const senderName = msg.sender?.username || 'Unknown';
        return `${senderName}: ${msg.content}`;
      })
      .join('\n');

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    // Generate summary using Gemini
    const summaryData = await generateSummary(messagesText, 'chat');

    // Create summary record
    const summary = await Summary.create({
      type: 'chat',
      content: summaryData.content,
      keyTopics: summaryData.keyTopics || [],
      actionItems: summaryData.actionItems || [],
      group: groupId,
      messageRange: {
        from: firstMessage.createdAt 
          ? (firstMessage.createdAt instanceof Date 
              ? firstMessage.createdAt.toISOString() 
              : new Date(firstMessage.createdAt).toISOString())
          : new Date().toISOString(),
        to: lastMessage.createdAt 
          ? (lastMessage.createdAt instanceof Date 
              ? lastMessage.createdAt.toISOString() 
              : new Date(lastMessage.createdAt).toISOString())
          : new Date().toISOString(),
        count: messages.length,
      },
      generatedBy: userId,
    });

    await summary.populate('generatedBy', 'username email avatar');
    
    // Format summary manually
    const summaryObj = summary.toObject();
    summaryObj._id = summaryObj._id.toString();
    summaryObj.createdAt = summaryObj.createdAt.toISOString();
    summaryObj.updatedAt = summaryObj.updatedAt.toISOString();
    if (summaryObj.messageRange) {
      summaryObj.messageRange = {
        ...summaryObj.messageRange,
        from: summaryObj.messageRange.from ? new Date(summaryObj.messageRange.from).toISOString() : null,
        to: summaryObj.messageRange.to ? new Date(summaryObj.messageRange.to).toISOString() : null,
      };
    }

    res.status(201).json(summaryObj);
  } catch (error) {
    console.error('Error in summary controller:', error);
    next(error);
  }
};

export const generateDocumentSummary = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { groupId } = req.params;
    const { fileId } = req.body;
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

    // Get file
    const file = await File.findById(fileId).lean();
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

    // Read file content from Cloudinary URL
    let fileContent = '';
    try {
      let fileBuffer;
      
      // Check if file is stored in Cloudinary (URL) or locally (path)
      if (file.url && (file.url.startsWith('http://') || file.url.startsWith('https://'))) {
        // File is in Cloudinary - download it
        fileBuffer = await new Promise((resolve, reject) => {
          const url = new URL(file.url);
          const client = url.protocol === 'https:' ? https : http;
          
          client.get(file.url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download file: ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });
      } else {
        // File is stored locally (backward compatibility)
        fileBuffer = await fs.readFile(file.path);
      }
      
      // Extract text based on file type
      if (file.mimeType.startsWith('text/')) {
        // Text files - read directly
        fileContent = fileBuffer.toString('utf-8');
      } else if (file.mimeType === 'application/pdf') {
        // PDF files - try to use pdf-parse if available
        try {
          const pdfParse = await import('pdf-parse').catch(() => null);
          if (pdfParse && pdfParse.default) {
            const pdfData = await pdfParse.default(fileBuffer);
            fileContent = pdfData.text;
          } else {
            return res.status(400).json({
              success: false,
              message: 'PDF parsing requires pdf-parse package. Please install it: npm install pdf-parse',
            });
          }
        } catch (error) {
          console.error('Error parsing PDF:', error);
          return res.status(500).json({
            success: false,
            message: 'Error parsing PDF: ' + (error.message || 'Unknown error'),
          });
        }
      } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX files - try to use mammoth if available
        try {
          const mammoth = await import('mammoth').catch(() => null);
          if (mammoth && mammoth.default) {
            const result = await mammoth.default.extractRawText({ buffer: fileBuffer });
            fileContent = result.value;
          } else {
            return res.status(400).json({
              success: false,
              message: 'DOCX parsing requires mammoth package. Please install it: npm install mammoth',
            });
          }
        } catch (error) {
          console.error('Error parsing DOCX:', error);
          return res.status(500).json({
            success: false,
            message: 'Error parsing DOCX: ' + (error.message || 'Unknown error'),
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type. Only TXT, PDF, and DOCX files are supported.',
        });
      }
    } catch (error) {
      console.error('Error reading file:', error);
      return res.status(500).json({
        success: false,
        message: 'Error reading file: ' + (error.message || 'Unknown error'),
      });
    }

    // Generate summary using Gemini
    const summaryData = await generateSummary(fileContent, 'document');

    // Create summary record
    const summary = await Summary.create({
      type: 'document',
      content: summaryData.content,
      keyTopics: summaryData.keyTopics || [],
      actionItems: summaryData.actionItems || [],
      group: groupId,
      sourceDocument: fileId,
      generatedBy: userId,
    });

    await summary.populate('generatedBy', 'username email avatar');
    await summary.populate('sourceDocument', 'originalName filename');
    
    // Format summary manually
    const summaryObj = summary.toObject();
    summaryObj._id = summaryObj._id.toString();
    summaryObj.createdAt = summaryObj.createdAt.toISOString();
    summaryObj.updatedAt = summaryObj.updatedAt.toISOString();

    res.status(201).json(summaryObj);
  } catch (error) {
    console.error('Error in summary controller:', error);
    next(error);
  }
};

export const deleteSummary = async (req, res, next) => {
  try {
    const { groupId, summaryId } = req.params;
    const userId = req.user._id.toString();

    const summary = await Summary.findById(summaryId);
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found',
      });
    }

    if (summary.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Summary does not belong to this group',
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

    // Check if user is creator, owner, or admin
    const isCreator = summary.generatedBy.toString() === userId;
    const isOwner = group.owner.toString() === userId;
    const member = group.members.find((m) => m.user.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isCreator && !isOwner && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this summary',
      });
    }

    await Summary.findByIdAndDelete(summaryId);

    res.json({});
  } catch (error) {
    console.error('Error in summary controller:', error);
    next(error);
  }
};

