#!/usr/bin/env node
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'OnePixel';

async function migratePermissions() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    // Find all users without permissions field
    const usersWithoutPermissions = await usersCollection
      .find({ permissions: { $exists: false } })
      .toArray();

    console.log(`📋 Found ${usersWithoutPermissions.length} users without permissions field`);

    if (usersWithoutPermissions.length === 0) {
      console.log('✅ All users already have permissions field');
      await client.close();
      return;
    }

    // Update all users without permissions to add the field
    const defaultPermissions = {
      canCreateGroups: false,
      canManageGroupAccess: false,
      canAccessTasklist: false
    };

    const result = await usersCollection.updateMany(
      { permissions: { $exists: false } },
      { $set: { permissions: defaultPermissions } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with default permissions`);
    console.log('✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migratePermissions();
