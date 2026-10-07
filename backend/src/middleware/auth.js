const jwt = require('jsonwebtoken');

// Secrets that are public because they appear in this repository.
const KNOWN_SECRETS = new Set(['learnsmart-dev-secret', 'learnsmart-dev-secret-change-in-production']);
const DEV_SECRET = 'learnsmart-dev-secret';

/**
 * The key that signs login tokens. Anyone who knows it can sign in as anyone,
 * so in production (NODE_ENV=production) the server refuses to start without
 * a private one of at least 32 characters. In development it falls back to a
 * fixed key and says so once.
 */
function resolveSecret(env = process.env) {
  const secret = env.JWT_SECRET;
  const weak = !secret || KNOWN_SECRETS.has(secret) || secret.length < 32;
  if (env.NODE_ENV === 'production' && weak) {
    throw new Error(
      'JWT_SECRET must be set to a private value of at least 32 characters when NODE_ENV=production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  if (weak && env.NODE_ENV !== 'test') {
    console.warn('[auth] JWT_SECRET is missing or public; fine for local development, never for a deployment.');
  }
  return secret || DEV_SECRET;
}

const JWT_SECRET = resolveSecret();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, signToken, JWT_SECRET, resolveSecret };
