// Script to clear a specific collection
// Usage: node scripts/clearCollection.js <collection-name> [--confirm]
// Example: node scripts/clearCollection.js users --confirm

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

const models = {
  users: User,
  groups: Group,
  messages: Message,
  files: File,
  summaries: Summary,
};

const clearCollection = async () => {
  try {
    const args = process.argv.slice(2);
    const collectionName = args[0];
    const confirmed = args.includes('--confirm');

    if (!collectionName) {
      console.log('❌ Please specify a collection name');
      console.log('📋 Available collections:');
      Object.keys(models).forEach(name => console.log(`   - ${name}`));
      console.log('\n💡 Usage: node scripts/clearCollection.js <collection-name> --confirm');
      process.exit(1);
    }

    if (!models[collectionName.toLowerCase()]) {
      console.log(`❌ Collection "${collectionName}" not found`);
      console.log('📋 Available collections:');
      Object.keys(models).forEach(name => console.log(`   - ${name}`));
      process.exit(1);
    }

    if (!confirmed) {
      console.log(`⚠️  WARNING: This will delete ALL data from "${collectionName}" collection!`);
      console.log(`💡 To proceed, run: node scripts/clearCollection.js ${collectionName} --confirm`);
      process.exit(0);
    }

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Model = models[collectionName.toLowerCase()];
    const count = await Model.countDocuments();
    
    console.log(`📊 Current count in "${collectionName}": ${count}`);

    // Delete all documents
    console.log(`🗑️  Deleting all documents from "${collectionName}"...`);
    const result = await Model.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} documents from "${collectionName}"\n`);

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

clearCollection();

