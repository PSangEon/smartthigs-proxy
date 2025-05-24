require('dotenv').config();
const express = require('express');
const fs = require('fs');
const qs = require('qs');
const http = require('http');
const https = require('https');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { getValidAccessToken } = require('./utils/tokenManager');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const HASHED_API_KEY = process.env.HASHED_API_KEY;
const SCOPE = process.env.SCOPE;
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3002;

const sslOptions = {
  key: fs.existsSync(path.join(__dirname, 'certs', 'key.pem')) 
    ? fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')) 
    : (() => { throw new Error('SSL key file not found: key.pem'); })(),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

// Auth middleware to validate API key from Authorization header
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const clientKey = authHeader.split(' ')[1];
  const match = await bcrypt.compare(clientKey, HASHED_API_KEY);

  if (!match) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
};

// HTTP-only app: root, login, and SmartThings API proxy routes
const httpApp = express();
httpApp.use(express.json());

httpApp.get('/', (req, res) => res.send('Hello HTTP!'));

httpApp.get('/login', (req, res) => {
  const authUrl = `https://api.smartthings.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}`;
  console.log('[OAuth Login] Redirecting to:', authUrl);
  res.redirect(authUrl);
});

// Proxy route to SmartThings API with API key authentication
httpApp.all('/smartthings/*', authMiddleware, async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const endpoint = req.params[0];

    const response = await axios({
      method: req.method,
      url: `https://api.smartthings.com/v1/${endpoint}`,
      headers: { Authorization: `Bearer ${token}` },
      params: req.query,
      data: req.body,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// HTTPS-only app: callback route for OAuth token exchange
const httpsApp = express();
httpsApp.use(express.json());

httpsApp.get('/callback', async (req, res) => {
  console.log('[OAuth Callback] code:', req.query.code);
  try {
    const code = req.query.code;
    const tokenRes = await axios.post(
      'https://api.smartthings.com/v1/oauth/token',
      qs.stringify({
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET,
        },
      }
    );
    const token = tokenRes.data;
    token.expires_at = Math.floor(Date.now() / 1000) + token.expires_in;
    fs.writeFileSync('token.json', JSON.stringify(token, null, 2));
    res.send('✅ Authentication successful. You can now use the SmartThings API!');
  } catch (error) {
    console.error('[OAuth Error]', error.response?.data || error.message);
    res.status(500).send('Error occurred during authentication');
  }
});

// Start HTTP server for non-sensitive routes
http.createServer(httpApp).listen(HTTP_PORT, () => {
  console.log(`HTTP server started at http://localhost:${HTTP_PORT}`);
});

// Start HTTPS server for sensitive callback route
https.createServer(sslOptions, httpsApp).listen(HTTPS_PORT, () => {
  console.log(`✅ HTTPS server running at https://localhost:${HTTPS_PORT}`);
});