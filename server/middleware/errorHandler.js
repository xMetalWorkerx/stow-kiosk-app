function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  // Default error status and message
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  
  // FIX #12: Error Stack Exposure in Production
  // Only include stack traces when NOT in production
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
