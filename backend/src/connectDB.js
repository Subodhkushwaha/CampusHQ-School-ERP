const mongoose = require('mongoose');

function maskUri(uri) {
  if (!uri) return 'NOT_SET';
  try {
    return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//****:****@');
  } catch {
    return '***[MASKED]***';
  }
}

async function connectWithRetry(dbUri, mongooseOptions, maxRetries = 3, delayMs = 3000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      if (attempt > 1) {
        console.log(`Retrying MongoDB connection (attempt ${attempt} of ${maxRetries})...`);
      }
      await mongoose.connect(dbUri, mongooseOptions);
      return;
    } catch (err) {
      if (attempt >= maxRetries) {
        throw err;
      }
      console.warn(`MongoDB connection attempt ${attempt} failed (${err.name}: ${err.message}). Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const dbUri =
    process.env.DATABASE || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!dbUri || (!dbUri.startsWith('mongodb://') && !dbUri.startsWith('mongodb+srv://'))) {
    const errorMsg =
      'Configuration Error: DATABASE or MONGODB_URI environment variable must be set and start with "mongodb://" or "mongodb+srv://".\n' +
      'Example: DATABASE="mongodb+srv://<username>:<password>@cluster0.fzeutel.mongodb.net/campushq?retryWrites=true&w=majority"';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Extract host and database name safely for logging without exposing credentials
  let hostInfo = 'unknown-host';
  let dbNameFromUri = null;
  try {
    const match = dbUri.match(/@([^\/?#]+)(?:\/([^?#]*))?/);
    if (match) {
      hostInfo = match[1];
      if (match[2] && match[2].trim() && match[2].trim().toLowerCase() !== 'test') {
        dbNameFromUri = match[2].trim();
      }
    } else {
      const simpleMatch = dbUri.match(/:\/\/([^\/?#]+)(?:\/([^?#]*))?/);
      if (simpleMatch) {
        hostInfo = simpleMatch[1];
        if (simpleMatch[2] && simpleMatch[2].trim() && simpleMatch[2].trim().toLowerCase() !== 'test') {
          dbNameFromUri = simpleMatch[2].trim();
        }
      }
    }
  } catch (_) {}

  // Explicitly ensure the database name is "campushq" (via DB_NAME env var, URI path, or default fallback)
  const targetDbName = process.env.DB_NAME || dbNameFromUri || 'campushq';

  console.log(`Connecting to MongoDB (host: ${hostInfo}, target database: "${targetDbName}")...`);

  const isProduction = process.env.NODE_ENV === 'production';
  const timeoutMs = isProduction ? 10000 : 10000;

  const mongooseOptions = {
    dbName: targetDbName,
    serverSelectionTimeoutMS: timeoutMs,
    socketTimeoutMS: 45000,
    maxPoolSize: isProduction ? 20 : 10,
  };

  try {
    await connectWithRetry(dbUri, mongooseOptions, isProduction ? 3 : 1, 3000);
    const activeDb = mongoose.connection.db?.databaseName || targetDbName;
    console.log(`Connected to MongoDB successfully (host: ${hostInfo}, active database: "${activeDb}")`);

    // Register runtime connection listeners for cloud resilience
    mongoose.connection.on('error', (err) => {
      console.error('Runtime MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost. Driver will automatically attempt reconnection.');
    });
  } catch (err) {
    const sanitizedUri = maskUri(dbUri);
    console.error('\n' + '='.repeat(68));
    console.error('DATABASE CONNECTION FAILED: Unable to connect to MongoDB');
    console.error(`Target Host:     ${hostInfo}`);
    console.error(`Target Database: ${targetDbName}`);
    console.error(`Sanitized URI:   ${sanitizedUri}`);
    console.error(`Error Name:      ${err.name}`);
    console.error(`Error Message:   ${err.message}`);

    const msg = (err.message || '').toLowerCase();
    const name = err.name || '';
    if (
      name.includes('ServerSelectionError') ||
      msg.includes('could not connect to any servers') ||
      msg.includes('timed out')
    ) {
      console.error('\nDIAGNOSIS: IP ACCESS LIST / FIREWALL ISSUE (Atlas Network Access)');
      console.error('Your hosting provider (Railway / Render) uses dynamic outbound IP addresses.');
      console.error('MongoDB Atlas rejected the connection because the connecting IP is not permitted.');
      console.error('To resolve: Add 0.0.0.0/0 to MongoDB Atlas -> Security -> Network Access.');
    } else if (msg.includes('auth') || msg.includes('authentication failed')) {
      console.error('\nDIAGNOSIS: AUTHENTICATION FAILURE');
      console.error('Verify the database user credentials and URL-encoded special characters in DATABASE.');
    } else if (msg.includes('enotfound') || msg.includes('querysrv')) {
      console.error('\nDIAGNOSIS: DNS RESOLUTION FAILURE');
      console.error('The cluster hostname could not be resolved. Verify cluster status in MongoDB Atlas.');
    }
    console.error('='.repeat(68) + '\n');
    throw new Error(`Database Connection Failed: ${err.message}`);
  }
}

module.exports = connectDB;

