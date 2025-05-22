const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

async function getValidAccessToken() {
  let token = JSON.parse(fs.readFileSync('token.json', 'utf-8'));
  const now = Math.floor(Date.now() / 1000);

  if (now >= token.expires_at) {
    console.log('[🔄] 토큰 갱신 중...');
    const res = await axios.post('https://api.smartthings.com/v1/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: token.refresh_token,
      },
    });

    token = res.data;
    token.expires_at = now + token.expires_in;
    fs.writeFileSync('token.json', JSON.stringify(token, null, 2));
  }

  return token.access_token;
}

module.exports = { getValidAccessToken };