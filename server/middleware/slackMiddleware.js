// Middleware to capture raw body for Slack signature verification
const captureRawBody = (req, res, next) => {
  // Skip if we already have a rawBody or body has been parsed
  if (req.rawBody || req.body) {
    return next();
  }
  
  // Skip if no data expected in request
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }
  
  let data = '';
  
  // Handle any errors during body reading
  req.on('error', (err) => {
    console.error('Error reading request body:', err);
    next(err);
  });
  
  // Read data chunks
  req.on('data', chunk => {
    data += chunk;
    // Safety check for excessive body size
    if (data.length > 1e6) { // 1MB limit
      data = '';
      res.status(413).send('Request entity too large');
      req.connection.destroy();
    }
  });
  
  req.on('end', () => {
    // Store raw body for signature verification
    req.rawBody = data;
    
    // If we're processing a URL-encoded form, attempt to parse it here
    // so downstream middleware doesn't hang waiting for body
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      try {
        // Simple parser for URL-encoded forms
        const parsed = {};
        const pairs = data.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key) {
            // Handle cases where the value might be undefined (empty parameter)
            parsed[decodeURIComponent(key)] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
          }
        }
        // Store parsed body so other middleware doesn't need to parse again
        req.body = req.body || parsed;
        
        // Log for debugging
        console.log("🔍 Parsed request body:", JSON.stringify(req.body, null, 2));
      } catch (e) {
        console.error('Error parsing form data:', e);
      }
    }
    
    next();
  });
};

module.exports = captureRawBody; 