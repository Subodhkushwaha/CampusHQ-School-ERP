const express = require('express');

const cors = require('cors');
const compression = require('compression');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');
const schoolApiRouter = require('./routes/appRoutes/schoolApi');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();
app.set('trust proxy', 1);

const mongoose = require('mongoose');

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8888',
  'http://127.0.0.1:8888',
  'https://campus-hq-school-erp.vercel.app',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    if (url.trim()) allowedOrigins.push(url.trim().replace(/\/+$/, ''));
  });
}
if (process.env.WEBSITE_URL) {
  process.env.WEBSITE_URL.split(',').forEach((url) => {
    if (url.trim()) allowedOrigins.push(url.trim().replace(/\/+$/, ''));
  });
}

const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith('.vercel.app') ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    // In local development, permit local development origins
    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Reject origin cleanly without throwing 500 error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Root index endpoint to prevent 404 when visiting the base backend URL
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CampusHQ School ERP API',
    status: 'running',
    health: '/api/health',
    version: '1.0.0',
    documentation: 'https://github.com/Subodhkushwaha/CampusHQ-School-ERP',
  });
});

// Health check endpoint for Render and uptime monitors
app.get(['/health', '/api/health'], async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  let initialized = false;
  if (isDbConnected) {
    try {
      const Admin = mongoose.model('Admin');
      const count = await Admin.countDocuments({ removed: false });
      initialized = count > 0;
    } catch (_) {}
  }
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: isDbConnected ? 'connected' : 'disconnected',
    systemInitialized: initialized,
  });
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// // default options
// app.use(fileUpload());

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/api', adminAuth.isValidAuthToken, schoolApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
