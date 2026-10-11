const mongoose = require('mongoose');

async function connectDB() {
  const dbUri = process.env.DATABASE || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!dbUri) {
    const errorMsg =
      'Configuration Error: DATABASE environment variable is not defined.\n' +
      'Please set DATABASE in backend/.env to a valid MongoDB connection string.\n' +
      'Example: DATABASE="mongodb://127.0.0.1:27017/campushq" or a MongoDB Atlas URI.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const timeoutMs = isProduction ? 15000 : 10000;

  // Mask credentials completely from URI for safe logging
  const safeMaskUri = (uri) => {
    try {
      return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//****:****@');
    } catch {
      return '***[MASKED]***';
    }
  };

  const sanitizedUri = safeMaskUri(dbUri);

  // Extract host and database name safely
  let hostInfo = 'unknown';
  let dbName = 'default';
  try {
    const match = dbUri.match(/@([^\/?#]+)(?:\/([^?#]*))?/);
    if (match) {
      hostInfo = match[1];
      dbName = match[2] || 'test (unspecified)';
    }
  } catch (_) {}

  console.log(`Attempting MongoDB connection to host: ${hostInfo}, database: ${dbName}...`);

  const mongooseOptions = {
    serverSelectionTimeoutMS: timeoutMs,
    socketTimeoutMS: 45000,
    maxPoolSize: isProduction ? 20 : 10,
  };

  try {
    await mongoose.connect(dbUri, mongooseOptions);
    console.log(`Connected to MongoDB successfully at ${sanitizedUri}`);

    // Register runtime listeners for connection resilience
    mongoose.connection.on('error', (err) => {
      console.error('Runtime MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Waiting for automatic reconnect...');
    });
  } catch (err) {
    console.error('\n' + '='.repeat(68));
    console.error(`DATABASE CONNECTION FAILED: Unable to connect to MongoDB`);
    console.error(`Target Host:     ${hostInfo}`);
    console.error(`Target Database: ${dbName}`);
    console.error(`Sanitized URI:   ${sanitizedUri}`);
    console.error(`Error Name:      ${err.name}`);
    console.error(`Error Details:   ${err.message}`);

    const msg = (err.message || '').toLowerCase();
    const name = err.name || '';

    if (
      name === 'MongoServerSelectionError' ||
      msg.includes('could not connect to any servers') ||
      msg.includes('serverselectionerror') ||
      msg.includes('timed out')
    ) {
      console.error('\n▶ DIAGNOSIS: ATLAS FIREWALL / NETWORK ACCESS RESTRICTION');
      console.error('  Your MongoDB Atlas cluster rejected incoming traffic from this server IP.');
      console.error('  Render runs on dynamic cloud IP addresses (AWS/GCP) that change over time.');
      console.error('\n▶ REQUIRED FIX IN MONGODB ATLAS:');
      console.error('  1. Go to: https://cloud.mongodb.com/v2/6acc08ed7cc765b497d87a41#/security/network/accessList');
      console.error('  2. Click "Add IP Address"');
      console.error('  3. Select "Allow Access From Anywhere" (0.0.0.0/0)');
      console.error('  4. Click "Confirm" and wait 1 minute for it to become Active.');
    } else if (
      msg.includes('authentication failed') ||
      msg.includes('bad auth') ||
      err.code === 18 ||
      err.codeName === 'AuthenticationFailed'
    ) {
      console.error('\n▶ DIAGNOSIS: DATABASE CREDENTIALS REJECTED');
      console.error('  Atlas rejected the username or password in your DATABASE connection string.');
      console.error('  Please verify your user in Atlas Security -> Database Access.');
    } else if (err.code === 'ENOTFOUND' || msg.includes('querysrv enotfound')) {
      console.error('\n▶ DIAGNOSIS: DNS RESOLUTION FAILURE');
      console.error(`  Unable to resolve DNS for cluster host: ${hostInfo}.`);
    }

    console.error('='.repeat(68) + '\n');
    throw new Error(`Database Connection Failed: ${err.message}`);
  }
}

module.exports = connectDB;
