#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Pulu:Pulu%409983@onepixelsoft.ey6oz0e.mongodb.net/jampack_db';
const [,, username, email, password] = process.argv;

if (!username || !email || !password) {
  console.error('Usage: node scripts/createAdmin.js <username> <email> <password>');
  process.exit(1);
}

async function main(){
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
   const db = client.db(process.env.DB_NAME);

    console.log('Connecting to MongoDB at:', MONGO_URI);
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const user = {
      username,
      email,
      name: username,
      passwordHash,
      admin: true,
      role: 'admin',
      createdAt: now,
      fileAccess: []
    };
    console.log('Admin user details:', user);
    const result = await db.collection('admin').updateOne({ username }, { $set: user }, { upsert: true });
    console.log('Update result:', result);
    console.log('Admin user created/updated:', username);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(2);
  } finally {
    try { await client.close(); } catch(e){}
  }
}

main();
