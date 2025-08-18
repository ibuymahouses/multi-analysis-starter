import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, getRow } from '../database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// Password hashing
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// JWT token management
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Session management
export const createSession = async (userId, token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
};

export const validateSession = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const session = await getRow(
    `SELECT us.*, u.email, u.first_name, u.last_name, u.subscription_tier, u.experience_level
     FROM user_sessions us
     JOIN users u ON us.user_id = u.id
     WHERE us.token_hash = $1 AND us.is_active = true AND us.expires_at > NOW()`,
    [tokenHash]
  );

  return session;
};

export const invalidateSession = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await query(
    'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
    [tokenHash]
  );
};

// User authentication
export const authenticateUser = async (email, password) => {
  const user = await getRow(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );

  if (!user || !user.password_hash) {
    return null;
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  return user;
};

export const authenticateGoogleUser = async (googleId, userData) => {
  let user = await getRow(
    'SELECT * FROM users WHERE google_id = $1 AND is_active = true',
    [googleId]
  );

  if (!user) {
    // Create new user from Google data
    const result = await query(
      `INSERT INTO users (email, google_id, first_name, last_name, experience_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userData.email, googleId, userData.firstName, userData.lastName, 'browsing_market']
    );
    user = result.rows[0];
  } else {
    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
  }

  return user;
};

// Middleware for protecting routes
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const session = await validateSession(token);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: session.user_id,
      email: session.email,
      firstName: session.first_name,
      lastName: session.last_name,
      subscriptionTier: session.subscription_tier,
      experienceLevel: session.experience_level
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Subscription tier validation
export const requireSubscription = (minTier = 'free') => {
  const tierLevels = { free: 0, basic: 1, premium: 2 };
  
  return (req, res, next) => {
    const userTier = req.user.subscriptionTier;
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[minTier] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: `This feature requires ${minTier} subscription or higher` 
      });
    }

    next();
  };
};
