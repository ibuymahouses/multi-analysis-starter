import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import memoryStorage from '../database/memory-storage.js';

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

  await memoryStorage.createSession(userId, tokenHash, expiresAt);
};

export const validateSession = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const session = await memoryStorage.findSessionByTokenHash(tokenHash);
  if (!session) return null;

  // Get user data
  const user = await memoryStorage.users.get(session.user_id);
  if (!user) return null;

  return {
    ...session,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    subscription_tier: user.subscription_tier,
    experience_level: user.experience_level
  };
};

export const invalidateSession = async (token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return await memoryStorage.invalidateSession(tokenHash);
};

// User authentication
export const authenticateUser = async (email, password) => {
  try {
    console.log('Authenticating user:', email);
    const user = await memoryStorage.findUserByEmail(email);

    if (!user) {
      console.log('User not found:', email);
      return null;
    }

    if (!user.password_hash) {
      console.log('User has no password hash:', email);
      return null;
    }

    console.log('Stored password hash:', user.password_hash);
    console.log('Attempting to compare with password:', password);
    
    const isValidPassword = await comparePassword(password, user.password_hash);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Password comparison failed');
      return null;
    }

    console.log('Password validation successful!');
    
    // Update last login
    await memoryStorage.updateUser(user.id, { last_login_at: new Date() });

    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

export const authenticateGoogleUser = async (googleId, userData) => {
  let user = await memoryStorage.findUserByGoogleId(googleId);

  if (!user) {
    // Create new user from Google data
    user = await memoryStorage.createUser({
      email: userData.email,
      google_id: googleId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      experience_level: 'browsing_market',
      subscription_tier: 'free',
      subscription_status: 'active'
    });

    // Create default user preferences
    await memoryStorage.createUserPreferences(user.id, {
      default_down_payment_percent: 20.00,
      preferred_metrics: {
        cash_flow: 1,
        value_vs_comps: 1,
        price_per_unit: 1,
        price_per_bed: 1,
        return_on_capital: 1
      }
    });
  } else {
    // Update last login
    await memoryStorage.updateUser(user.id, { last_login_at: new Date() });
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
