const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');

// Apply rate limiting to authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 25, // 25 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    result: null,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

router.route('/login').post(authLimiter, catchErrors(adminAuth.login));

router.route('/forgetpassword').post(authLimiter, catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(authLimiter, catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

module.exports = router;
