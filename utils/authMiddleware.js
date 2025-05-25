const bcrypt = require('bcrypt');
const HASHED_API_KEY = process.env.HASHED_API_KEY;

module.exports = async (req, res, next) => {
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

