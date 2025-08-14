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
} from '../auth/auth.js';
import { query, getRow, transaction } from '../database/connection.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().isMobilePhone(),
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
    const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const result = await transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, experience_level)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, subscription_tier, experience_level`,
        [email, passwordHash, firstName, lastName, phone, experienceLevel]
      );

      // Create default user preferences
      await client.query(
        `INSERT INTO user_preferences (user_id, default_down_payment_percent, preferred_metrics)
         VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, 20.00, JSON.stringify({
          cash_flow: 1,
          value_vs_comps: 1,
          price_per_unit: 1,
          price_per_bed: 1,
          return_on_capital: 1
        })]
      );

      return userResult.rows[0];
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token and create session
    const token = generateToken(user.id);
    await createSession(user.id, token);

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
    res.status(500).json({ error: 'Login failed' });
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
    const user = await getRow(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.experience_level, 
              u.subscription_tier, u.subscription_status, u.subscription_expires_at,
              u.created_at, u.last_login_at,
              up.default_down_payment_percent, up.preferred_metrics, up.default_loan_terms
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

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
        preferences: {
          defaultDownPaymentPercent: user.default_down_payment_percent,
          preferredMetrics: user.preferred_metrics,
          defaultLoanTerms: user.default_loan_terms
        }
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
  body('phone').optional().isMobilePhone(),
  body('experienceLevel').optional().isIn(['first_investment', 'one_rental_expanding', 'several_rentals_scaling', 'browsing_market'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone, experienceLevel } = req.body;
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(lastName);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      updateValues.push(phone);
    }
    if (experienceLevel) {
      updateFields.push(`experience_level = $${paramCount++}`);
      updateValues.push(experienceLevel);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} RETURNING *`,
      updateValues
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        phone: result.rows[0].phone,
        experienceLevel: result.rows[0].experience_level,
        subscriptionTier: result.rows[0].subscription_tier
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
