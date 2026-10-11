require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const path = require('path');
const { globSync } = require('glob');
const connectDB = require('../connectDB');

async function upgrade() {
  try {
    await connectDB();
    console.log('Running database schema and index synchronization...');

    // Load all models
    const modelsFiles = globSync(path.join(__dirname, '../models/**/*.js').replace(/\\/g, '/'));
    for (const filePath of modelsFiles) {
      require(path.resolve(filePath));
    }

    // Sync indexes for all registered models
    const modelNames = mongoose.modelNames();
    for (const name of modelNames) {
      const model = mongoose.model(name);
      await model.syncIndexes();
      console.log(`Synced indexes for model: ${name}`);
    }

    console.log('Database upgrade and index synchronization completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Upgrade script failed:', err.message);
    process.exit(1);
  }
}

upgrade();
