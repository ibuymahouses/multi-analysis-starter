import express from 'express';
import { body, validationResult } from 'express-validator';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  createSession, 
  invalidateSession,
  authenticateUser,
  authenticateGoogleUser,
  requireAuth 
} from '../auth/auth-memory.js';
import memoryStorage from '../database/memory-storage.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Phone number must be valid'),
  body('experienceLevel').isIn(['first_investment', 'one_rental_expanding', 'several_rentals_scaling', 'browsing_market'])
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, experienceLevel } = req.body;

    // Check if user already exists
    const existingUser = await memoryStorage.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const result = await memoryStorage.createUser({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone,
      experience_level: experienceLevel,
      subscription_tier: 'free',
      subscription_status: 'active'
    });

    // Create default user preferences
    await memoryStorage.createUserPreferences(result.id, {
      default_down_payment_percent: 20.00,
      preferred_metrics: {
        cash_flow: 1,
        value_vs_comps: 1,
        price_per_unit: 1,
        price_per_bed: 1,
        return_on_capital: 1
      }
    });

    // Generate token and create session
    const token = generateToken(result.id);
    await createSession(result.id, token);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        subscriptionTier: result.subscription_tier,
        experienceLevel: result.experience_level
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await authenticateUser(email, password);
    if (!user) {
      console.log('Authentication failed for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User authenticated successfully:', user.email);

    // Generate token and create session
    const token = generateToken(user.id);
    await createSession(user.id, token);

    console.log('Session created for user:', user.email);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        experienceLevel: user.experience_level
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Google OAuth login/register
router.post('/google', async (req, res) => {
  try {
    const { googleId, userData } = req.body;

    if (!googleId || !userData) {
      return res.status(400).json({ error: 'Google ID and user data are required' });
    }

    const user = await authenticateGoogleUser(googleId, userData);

    // Generate token and create session
    const token = generateToken(user.id);
    await createSession(user.id, token);

    res.json({
      message: 'Google authentication successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        experienceLevel: user.experience_level
      },
      token
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Logout user
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    await invalidateSession(token);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await memoryStorage.users.get(req.user.id);
    const preferences = await memoryStorage.findUserPreferences(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        experienceLevel: user.experience_level,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status,
        subscriptionExpiresAt: user.subscription_expires_at,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        preferences: preferences ? {
          defaultDownPaymentPercent: preferences.default_down_payment_percent,
          preferredMetrics: preferences.preferred_metrics,
          defaultLoanTerms: preferences.default_loan_terms
        } : null
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', requireAuth, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Phone number must be valid'),
  body('experienceLevel').optional().isIn(['first_investment', 'one_rental_expanding', 'several_rentals_scaling', 'browsing_market'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone, experienceLevel } = req.body;
    const updates = {};

    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (experienceLevel) updates.experience_level = experienceLevel;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await memoryStorage.updateUser(req.user.id, updates);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        phone: result.phone,
        experienceLevel: result.experience_level,
        subscriptionTier: result.subscription_tier
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
