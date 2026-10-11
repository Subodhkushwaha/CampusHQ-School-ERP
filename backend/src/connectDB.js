const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let mongodInstance = null;

async function connectDB() {
  const dbUri = process.env.DATABASE || 'mongodb://127.0.0.1:27017/idurar';

  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`Connected to MongoDB at ${dbUri}`);
    return;
  } catch (err) {
    console.warn(
      `Could not connect to external MongoDB at ${dbUri} (${err.message}). Initializing local embedded MongoDB...`
    );
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbPath: dataDir,
        },
      });
    } catch {
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbPath: dataDir,
        },
      });
    }

    const embeddedUri = mongodInstance.getUri() + 'idurar';
    process.env.DATABASE = embeddedUri;
    await mongoose.connect(embeddedUri);
    console.log(`Connected to local embedded MongoDB at ${embeddedUri}`);
  } catch (embeddedErr) {
    console.error('Failed to start embedded MongoDB:', embeddedErr.message);
    throw embeddedErr;
  }
}

module.exports = connectDB;
