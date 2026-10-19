/*
  Catch Errors Handler

  Catches any errors thrown by async route handlers and maps them to appropriate HTTP status codes.
*/

exports.catchErrors = (fn) => {
  return function (req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch((error) => {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          result: null,
          message: `Invalid ID format for parameter: ${error.path || 'id'}`,
          error: error.message,
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          result: null,
          message: 'Conflict: A record with this unique field value already exists.',
          error: error.message,
        });
      }

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          result: null,
          message: error.message || 'Validation Error: Required fields are missing or invalid.',
          controller: fn.name,
          error: error,
        });
      }

      // Unexpected Server Error
      return res.status(500).json({
        success: false,
        result: null,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        controller: fn.name,
        error: process.env.NODE_ENV === 'production' ? null : error,
      });
    });
  };
};

/*
  Not Found Error Handler
*/
exports.notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: "Requested API endpoint does not exist",
  });
};

/*
  Development Error Handler
*/
exports.developmentErrors = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Uploaded file exceeds the maximum allowed size limit of 15 MB.',
      error: error.message,
    });
  }
  if (error.type === 'entity.too.large' || error.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Request payload exceeds the maximum allowed limit.',
      error: error.message,
    });
  }
  error.stack = error.stack || '';
  return res.status(error.status || 500).json({
    success: false,
    message: error.message,
    error: error,
  });
};

/*
  Production Error Handler
*/
exports.productionErrors = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Uploaded file exceeds the maximum allowed size limit of 15 MB.',
      error: null,
    });
  }
  if (error.type === 'entity.too.large' || error.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Request payload exceeds the maximum allowed limit.',
      error: null,
    });
  }
  return res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    error: null,
  });
};
