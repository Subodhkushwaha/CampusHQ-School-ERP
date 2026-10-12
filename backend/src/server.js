require('module-alias/register');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

// Make sure we are running node 20+
const [major] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.error('Please upgrade your node.js version to at least 20 or greater. Current version:', process.version);
  process.exit(1);
}

// import environmental variables from our environment files
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: '.env' });

// Validate critical required environment variables
const dbUri = process.env.DATABASE || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
if (!process.env.DATABASE && dbUri) {
  process.env.DATABASE = dbUri;
}

if (!process.env.DATABASE) {
  console.error('CRITICAL STARTUP ERROR: DATABASE environment variable is required.');
  console.error('Please provide a valid MongoDB connection string in backend/.env or hosting environment (DATABASE or MONGODB_URI).');
  process.exit(1);
}

if (!process.env.DATABASE.startsWith('mongodb://') && !process.env.DATABASE.startsWith('mongodb+srv://')) {
  console.error('CRITICAL STARTUP ERROR: DATABASE environment variable is malformed.');
  console.error('DATABASE must begin with "mongodb://" or "mongodb+srv://".');
  console.error('Received format does not match expected MongoDB connection URI.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL STARTUP ERROR: JWT_SECRET environment variable is required.');
  console.error('Please define a secure random JWT_SECRET in backend/.env');
  process.exit(1);
}

const connectDB = require('./connectDB');

// Load all database models before controllers
const modelsFiles = globSync(path.join(__dirname, 'models/**/*.js').replace(/\\/g, '/'));

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

async function startServer() {
  try {
    await connectDB();

    // Start our app!
    const app = require('./app');
    const port = process.env.PORT || 8888;
    app.set('port', port);
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Express running → On PORT : ${server.address().port}`);
    });
  } catch (err) {
    console.log(`Failed to start server: ${err.message}`);
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
