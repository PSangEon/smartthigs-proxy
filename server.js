require('dotenv').config();
const express = require('express');
const qs = require('qs');
const https = require('https');
const axios = require('axios');
const { getValidAccessToken } = require('./utils/tokenManager');

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPE = process.env.SCOPE;
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3002;
const CODE = process.env.CODE || `aa`;

// Verify server operation
app.get('/', (req, res) => {
  res.send('🔒 HTTPS server up and running!');
});

// 1. redirect the login URL
app.get('/login', (req, res) => {
  const authUrl = `https://api.smartthings.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}`;
  console.log('[OAuth Login] Redirecting to:', authUrl);
  res.redirect(authUrl);
});

// 2. get verification code from callback to issue and store token
app.get('/callback', async (req, res) => {
  console.log('[OAuth Callback] code:', req.query.code);
  try {
    const code = CODE || req.query.code;
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
    res.status(500).send('Error during authentication');
  }
});
app.get('/refrash', async (req, res) => {
  try {
    const token = await getValidAccessToken();
    res.json(token);
  } catch (error) {
    console.error('[Refresh Token Error]', error.response?.data || error.message);
    res.status(500).send('Error renewing token');
  }
});

// 3. SmartThings API Request Proxy
app.all('/smartthings/*', async (req, res) => {
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

app.listen(HTTP_PORT, () => {
  console.log(`Server started at http://localhost:${HTTP_PORT}`);
});
