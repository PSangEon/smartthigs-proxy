### 📌 INFO
🔧 Simple OAuth2-based proxy server to access SmartThings APIs
### 🚀 Quick Start
✅ Install the required packages with `npm install`. 

✅ Set up your client ID, secret, redirect URI, scope, etc. in the `.env` file. 
```
CLIENT_ID=Client_ID
CLIENT_SECRET=Client_Secret
REDIRECT_URI=Callback_URL
SCOPE=Request_Scope
HTTP_PORT=Desired_Port (e.g. 3000)
```

✅ Run the server with the `node app.js` command. 

✅ Connect to `http://localhost:{port}/login` in your browser to start authenticating.

### 🔑 Key features
🔒 **/login**: Redirect to the SmartThings login page

🔑 **/callback**: Issuing and storing access tokens with verification codes

🔄 **/refrash**: Issuing a new access token with a stored refresh token

🔗 **/smartthings/***: Proxying SmartThings API requests
### ⚠️ Caveats
⚙️ The issued token is stored in `token.json` and should not be exposed to the outside world.

🔐 HTTPS setup is required for OAuth2 authentication
### 📚 Request an example
📝 Get a list of SmartThings devices:

GET http://localhost:{PROT}/smartthings/devices

📝 Get a list of SmartThings Scene:

GET http://localhost:{PORT}/smartthings/scenes
