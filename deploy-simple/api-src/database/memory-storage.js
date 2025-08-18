// In-memory storage for development/testing
// This will be replaced with PostgreSQL in production

class MemoryStorage {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.savedSearches = new Map();
    this.userPreferences = new Map();
    this.subscriptionHistory = new Map();
    
    // Initialize with some test data synchronously
    this.initializeTestData();
  }

  initializeTestData() {
    // Create a test user with a working bcrypt hash for "password123"
    // This hash was generated and tested to work with: bcrypt.hash('password123', 12)
    const testUserId = 'test-user-1';
    const passwordHash = '$2a$12$6HmwWPIn41Fn8xVCZxn6g.hUHIFAlLgbSKzPsc7.FC1ygBhdBdMFO';
    
    this.users.set(testUserId, {
      id: testUserId,
      email: 'test@example.com',
      password_hash: passwordHash,
      google_id: null,
      first_name: 'Test',
      last_name: 'User',
      phone: '555-123-4567',
      experience_level: 'first_investment',
      subscription_tier: 'free',
      subscription_status: 'active',
      subscription_expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
      is_active: true
    });

    // Create test user preferences
    this.userPreferences.set(testUserId, {
      id: 'pref-1',
      user_id: testUserId,
      default_down_payment_percent: 20.00,
      default_loan_terms: null,
      preferred_metrics: {
        cash_flow: 1,
        value_vs_comps: 1,
        price_per_unit: 1,
        price_per_bed: 1,
        return_on_capital: 1
      },
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('Test user created: test@example.com / password123');
  }

  // User operations
  async createUser(userData) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      ...userData,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };
    this.users.set(userId, user);
    return user;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email && user.is_active) {
        return user;
      }
    }
    return null;
  }

  async findUserByGoogleId(googleId) {
    for (const user of this.users.values()) {
      if (user.google_id === googleId && user.is_active) {
        return user;
      }
    }
    return null;
  }

  async updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates, updated_at: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Session operations
  async createSession(userId, tokenHash, expiresAt) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date(),
      is_active: true
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash) {
    for (const session of this.sessions.values()) {
      if (session.token_hash === tokenHash && session.is_active && session.expires_at > new Date()) {
        return session;
      }
    }
    return null;
  }

  async invalidateSession(tokenHash) {
    for (const session of this.sessions.values()) {
      if (session.token_hash === tokenHash) {
        session.is_active = false;
        return true;
      }
    }
    return false;
  }

  // User preferences operations
  async createUserPreferences(userId, preferences) {
    const prefId = `pref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userPrefs = {
      id: prefId,
      user_id: userId,
      ...preferences,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.userPreferences.set(userId, userPrefs);
    return userPrefs;
  }

  async findUserPreferences(userId) {
    return this.userPreferences.get(userId) || null;
  }

  async updateUserPreferences(userId, updates) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return null;
    
    const updatedPrefs = { ...prefs, ...updates, updated_at: new Date() };
    this.userPreferences.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  // Saved searches operations
  async createSavedSearch(userId, searchData) {
    const searchId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const savedSearch = {
      id: searchId,
      user_id: userId,
      ...searchData,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    if (!this.savedSearches.has(userId)) {
      this.savedSearches.set(userId, []);
    }
    this.savedSearches.get(userId).push(savedSearch);
    return savedSearch;
  }

  async findSavedSearches(userId) {
    return this.savedSearches.get(userId) || [];
  }

  async updateSavedSearch(searchId, updates) {
    for (const searches of this.savedSearches.values()) {
      const search = searches.find(s => s.id === searchId);
      if (search) {
        Object.assign(search, updates, { updated_at: new Date() });
        return search;
      }
    }
    return null;
  }

  async deleteSavedSearch(searchId) {
    for (const searches of this.savedSearches.values()) {
      const index = searches.findIndex(s => s.id === searchId);
      if (index !== -1) {
        return searches.splice(index, 1)[0];
      }
    }
    return null;
  }

  // Subscription history operations
  async createSubscriptionHistory(userId, fromTier, toTier, changeReason) {
    const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const history = {
      id: historyId,
      user_id: userId,
      from_tier: fromTier,
      to_tier: toTier,
      change_reason: changeReason,
      changed_at: new Date()
    };
    
    if (!this.subscriptionHistory.has(userId)) {
      this.subscriptionHistory.set(userId, []);
    }
    this.subscriptionHistory.get(userId).push(history);
    return history;
  }

  // Utility methods
  async query(sql, params = []) {
    // Mock query method for compatibility
    console.log('Mock query:', sql, params);
    return { rows: [], rowCount: 0 };
  }

  async getRow(sql, params = []) {
    // Mock getRow method for compatibility
    console.log('Mock getRow:', sql, params);
    return null;
  }

  async getRows(sql, params = []) {
    // Mock getRows method for compatibility
    console.log('Mock getRows:', sql, params);
    return [];
  }

  async transaction(callback) {
    // Mock transaction method for compatibility
    console.log('Mock transaction');
    return await callback(this);
  }
}

// Create singleton instance
const memoryStorage = new MemoryStorage();

export default memoryStorage;
