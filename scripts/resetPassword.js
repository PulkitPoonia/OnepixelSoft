import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'your_mongo_uri_here';
const username = 'pulkitpoonia07'; // Username to update
const newPassword = 'Pulu@9983'; // New password to set

async function resetPassword() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
const db = client.db(process.env.DB_NAME);


    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const result = await db.collection('users').updateOne(
      { username },
      { $set: { passwordHash } }
    );

    if (result.matchedCount === 0) {
      console.log('User not found');
    } else {
      console.log('Password updated successfully');
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

resetPassword();