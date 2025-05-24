const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Token renewal logic (with correct curl-style request)
async function getValidAccessToken() {
  let token = JSON.parse(fs.readFileSync('token.json', 'utf-8'));
  const now = Math.floor(Date.now() / 1000);

  if (now >= token.expires_at) {
    console.log('[🔄] Renewing token...');
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const res = await axios.post(
      'https://api.smartthings.com/v1/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    token = res.data;
    token.expires_at = now + token.expires_in;
    fs.writeFileSync('token.json', JSON.stringify(token, null, 2));
  }

  return token.access_token;
}

module.exports = { getValidAccessToken };

