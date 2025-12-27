// Script to clear all data from MongoDB
// Usage: node scripts/clearDatabase.js [--confirm]

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Import models
import User from '../models/User.js';
import Group from '../models/Group.js';
import Message from '../models/Message.js';
import File from '../models/File.js';
import Summary from '../models/Summary.js';

const clearDatabase = async () => {
  try {
    // Check for confirmation flag
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');

    if (!confirmed) {
      console.log('⚠️  WARNING: This will delete ALL data from the database!');
      console.log('📋 Collections to be deleted:');
      console.log('   - users');
      console.log('   - groups');
      console.log('   - messages');
      console.log('   - files');
      console.log('   - summaries');
      console.log('\n💡 To proceed, run: node scripts/clearDatabase.js --confirm');
      process.exit(0);
    }

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get collection counts before deletion
    const userCount = await User.countDocuments();
    const groupCount = await Group.countDocuments();
    const messageCount = await Message.countDocuments();
    const fileCount = await File.countDocuments();
    const summaryCount = await Summary.countDocuments();

    console.log('📊 Current data:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Groups: ${groupCount}`);
    console.log(`   Messages: ${messageCount}`);
    console.log(`   Files: ${fileCount}`);
    console.log(`   Summaries: ${summaryCount}\n`);

    // Delete all documents
    console.log('🗑️  Deleting data...');
    
    const results = await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Message.deleteMany({}),
      File.deleteMany({}),
      Summary.deleteMany({}),
    ]);

    console.log('✅ Deletion complete!\n');
    console.log('📊 Deleted:');
    console.log(`   Users: ${results[0].deletedCount}`);
    console.log(`   Groups: ${results[1].deletedCount}`);
    console.log(`   Messages: ${results[2].deletedCount}`);
    console.log(`   Files: ${results[3].deletedCount}`);
    console.log(`   Summaries: ${results[4].deletedCount}\n`);

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

clearDatabase();

