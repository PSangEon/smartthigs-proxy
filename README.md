### 📌 INFO
🔧 Simple OAuth2-based proxy server to access SmartThings APIs

### 🚀 Quick Start

✅ Install the required packages with `npm install`.

✅ Set up your client ID, secret, redirect URI, scope, etc. in the `.env` file.

```
CLIENT_ID=Client_ID
CLIENT_SECRET=Client_Secret
REDIRECT_URI=https://your-domain:{PORT}/callback
HASHED_API_KEY=Key values hashed with bcrypt
SCOPE=Request_Scope
HTTP_PORT=Desired_Port (e.g. 3000)
HTTPS_PORT=Desired_Port (e.g. 3001)
```

✅ Run the server with the `node app.js` command.

✅ Verify that `https://your-domain:{PORT}/callback` is reachable.

✅ Follow the instructions to install the SmartSync CLI and create an APP:

https://developer.smartthings.com/docs/sdks/cli

✅ Update the values in `.env` and restart the server.

✅ Connect to `http://your-domain:{PORT}/login` in your browser to start authenticating.

---

### 🔑 Key Features

🔒 **/login**: Redirects to the SmartThings login page.

🔑 **/callback**: Issues and stores access tokens with verification codes.

🔄 **/refresh**: Issues a new access token using a stored refresh token.

🔗 **/smartthings/***: Proxies SmartThings API requests.

---

### ⚠️ Caveats

⚙️ The issued token is stored in `token.json` and **must not** be exposed to the outside world.

🔐 HTTPS setup is required for OAuth2 authentication.

---

### 📚 Example Requests

📝 Get a list of SmartThings devices:

```
GET https://your-domain:{PORT}/smartthings/devices
```

📝 Get a list of SmartThings scenes:

```
GET https://your-domain:{PORT}/smartthings/scenes
```
