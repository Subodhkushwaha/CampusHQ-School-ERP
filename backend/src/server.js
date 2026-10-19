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

// Determine MongoDB connection URI with clear precedence:
// 1. DATABASE (primary project convention)
// 2. MONGODB_URI (standard cloud provider convention)
// 3. MONGO_URI (legacy fallback)
// 4. DATABASE_URL (generic cloud fallback)
const rawDbUri =
  process.env.DATABASE ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

const dbUri = typeof rawDbUri === 'string' ? rawDbUri.trim().replace(/^["']|["']$/g, '') : null;

if (!dbUri) {
  console.error('\n' + '='.repeat(70));
  console.error('CRITICAL STARTUP ERROR: MongoDB connection URI is required.');
  console.error('Neither DATABASE nor MONGODB_URI environment variable was found.');
  console.error('Expected variable names:');
  console.error('  1. DATABASE    (Primary)');
  console.error('  2. MONGODB_URI (Secondary fallback)');
  console.error('\nACTION REQUIRED ON RAILWAY:');
  console.error('  1. Open your Railway project dashboard:');
  console.error('     https://railway.com/project/f23debcb-3be3-48c7-865d-880f1b53e811');
  console.error('  2. Select your backend service.');
  console.error('  3. Navigate to the "Variables" tab.');
  console.error('  4. Add the variable:');
  console.error('     DATABASE=mongodb+srv://<username>:<password>@cluster0.fzeutel.mongodb.net/campushq?retryWrites=true&w=majority');
  console.error('     (or MONGODB_URI with the same connection string)');
  console.error('='.repeat(70) + '\n');
  process.exit(1);
}

process.env.DATABASE = dbUri;

if (!dbUri.startsWith('mongodb://') && !dbUri.startsWith('mongodb+srv://')) {
  console.error('\n' + '='.repeat(70));
  console.error('CRITICAL STARTUP ERROR: MongoDB connection URI is malformed.');
  console.error('DATABASE must begin with "mongodb://" or "mongodb+srv://".');
  console.error('Received protocol format does not match expected MongoDB connection URI.');
  console.error('='.repeat(70) + '\n');
  process.exit(1);
}

const rawJwt = process.env.JWT_SECRET;
const jwtSecret = typeof rawJwt === 'string' ? rawJwt.trim().replace(/^["']|["']$/g, '') : null;
if (!jwtSecret) {
  console.error('\n' + '='.repeat(70));
  console.error('CRITICAL STARTUP ERROR: JWT_SECRET environment variable is required.');
  console.error('Please define a secure random JWT_SECRET in your Railway service Variables tab');
  console.error('or backend/.env for local development.');
  console.error('='.repeat(70) + '\n');
  process.exit(1);
}
process.env.JWT_SECRET = jwtSecret;


const connectDB = require('./connectDB');

// Load all database models before controllers
const modelsFiles = globSync(path.join(__dirname, 'models/**/*.js').replace(/\\/g, '/'));

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

async function startServer() {
  try {
    await connectDB();

    // Automatically initialize default settings & seed role accounts if database is empty
    const Admin = mongoose.model('Admin');
    const adminCount = await Admin.countDocuments({ removed: false });
    if (adminCount === 0) {
      console.log('NOTICE: Database has 0 user accounts. Initializing default system & role accounts...');
      try {
        const seedSchool = require('./setup/seedSchoolData');
        await seedSchool();
        console.log('Database initialization completed.');
      } catch (seedErr) {
        console.warn('Auto-seed warning (non-fatal):', seedErr.message);
      }
    }

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
