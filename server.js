require('dotenv').config();
const express = require('express');
const fs = require('fs');
const qs = require('qs');
const http = require('http');
const https = require('https');
const path = require('path');
const axios = require('axios');
const { getValidAccessToken } = require('./utils/tokenManager');
const { log, logError } = require('./utils/logger');
const authMiddleware = require('./utils/authMiddleware');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPE = process.env.SCOPE;
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3002;

const sslOptions = {
  key: fs.existsSync(path.join(__dirname, 'certs', 'key.pem')) 
    ? fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')) 
    : (() => { throw new Error('SSL key file not found: key.pem'); })(),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

// HTTP-only app: root, login, and SmartThings API proxy routes
const httpApp = express();
httpApp.use(express.json());
httpApp.use(express.urlencoded({ extended: true }));

httpApp.get('/', (req, res) => res.send('Hello HTTP!'));

httpApp.get('/login', (req, res) => {
  const authUrl = `https://api.smartthings.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}`;
  log('[OAuth Login] Redirecting to:', authUrl);
  res.redirect(authUrl);
});

const getRawBody = require('raw-body');

// Proxy route to SmartThings API with API key authentication
httpApp.all('/smartthings/*', authMiddleware, async (req, res) => {
  try {
        const raw = await getRawBody(req);
    let parsedBody = null;

    if (raw.length > 0) {
      try {
        parsedBody = JSON.parse(raw.toString());
      } catch (err) {
        logError('JSON parse error:', err.message);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }
    log('Parsed body (forced):', parsedBody);
    const token = await getValidAccessToken();
    const endpoint = req.params[0];

    const axiosOptions = {
      method: req.method,
      url: `https://api.smartthings.com/v1/${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
    };

    if (
      ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) &&
      parsedBody !== null &&
      !(typeof parsedBody === 'object' && Object.keys(parsedBody).length === 0)
    ) {
      axiosOptions.data = parsedBody;
    }

    const response = await axios(axiosOptions);

    res.status(response.status).json(response.data);
  } catch (error) {
    logError(error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});


// HTTPS-only app: callback route for OAuth token exchange
const httpsApp = express();
httpsApp.use(express.json());

httpsApp.get('/callback', async (req, res) => {
  log('[OAuth Callback] code:', req.query.code);
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
    logError('[OAuth Error]', error.response?.data || error.message);
    res.status(500).send('Error occurred during authentication');
  }
});

// Start HTTP server for non-sensitive routes
http.createServer(httpApp).listen(HTTP_PORT, () => {
  log(`HTTP server started at http://localhost:${HTTP_PORT}`);
});

// Start HTTPS server for sensitive callback route
https.createServer(sslOptions, httpsApp).listen(HTTPS_PORT, () => {
  log(`✅ HTTPS server running at https://localhost:${HTTPS_PORT}`);
});