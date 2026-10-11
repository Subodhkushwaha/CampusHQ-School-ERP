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

  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: timeoutMs });
    // Mask password in logged URI for security
    const sanitizedUri = dbUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connected to MongoDB successfully at ${sanitizedUri}`);
  } catch (err) {
    const sanitizedUri = dbUri.replace(/:([^:@]+)@/, ':****@');
    const failureMsg =
      `Database Connection Failed: Unable to connect to MongoDB at ${sanitizedUri}.\n` +
      `Error: ${err.message}\n` +
      `Please ensure your MongoDB instance is running or your Atlas connection string and network whitelist are correct.`;
    console.error(failureMsg);
    throw new Error(failureMsg);
  }
}

module.exports = connectDB;
