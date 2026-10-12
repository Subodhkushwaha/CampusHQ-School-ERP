const mongoose = require('mongoose');

async function connectDB() {
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
    await mongoose.connect(dbUri, mongooseOptions);
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
    console.log(`DATABASE CONNECTION FAILED: Unable to connect to MongoDB (host: ${hostInfo}, database: "${targetDbName}"). [${err.name}] ${err.message}`);
    console.error('\n' + '='.repeat(68));
    console.error('DATABASE CONNECTION FAILED: Unable to connect to MongoDB');
    console.error(`Target Host:     ${hostInfo}`);
    console.error(`Target Database: ${targetDbName}`);
    console.error(`Error Name:      ${err.name}`);
    console.error(`Error Message:   ${err.message}`);
    console.error('='.repeat(68) + '\n');
    throw new Error(`Database Connection Failed: ${err.message}`);
  }
}

module.exports = connectDB;
