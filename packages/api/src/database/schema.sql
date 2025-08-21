-- Database Schema for Multi-Analysis App
-- User Authentication and Profile System

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for Google OAuth users
    google_id VARCHAR(255) UNIQUE, -- NULL for email/password users
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN (
        'first_investment',
        'one_rental_expanding', 
        'several_rentals_scaling',
        'browsing_market'
    )),
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'suspended')),
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Saved searches table
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL, -- Flexible storage for search parameters
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- User preferences for search defaults
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_down_payment_percent DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    default_loan_terms JSONB, -- For premium users to customize loan assumptions
    preferred_metrics JSONB, -- Weighted metrics preferences
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Subscription history for audit trail
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_tier VARCHAR(20) NOT NULL,
    to_tier VARCHAR(20) NOT NULL,
    change_reason VARCHAR(100),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CORE DATA TABLES
-- ============================================================================

-- Rent data table (BHA and other sources)
CREATE TABLE rents (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(10) NOT NULL,
    town VARCHAR(100),
    county VARCHAR(100),
    market_tier VARCHAR(50) DEFAULT 'unknown',
    studio_rent DECIMAL(10,2),
    one_br_rent DECIMAL(10,2),
    two_br_rent DECIMAL(10,2),
    three_br_rent DECIMAL(10,2),
    four_br_rent DECIMAL(10,2),
    five_br_rent DECIMAL(10,2),
    six_br_rent DECIMAL(10,2),
    source VARCHAR(50) DEFAULT 'bha',
    metadata JSONB, -- Additional data like update frequency, source details
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(zip_code, source)
);

-- Property listings table
CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    list_no VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255),
    town VARCHAR(100),
    state VARCHAR(10) DEFAULT 'MA',
    zip_code VARCHAR(10),
    list_price DECIMAL(12,2),
    units_final INTEGER,
    no_units_mf INTEGER, -- Total bedrooms
    unit_mix JSONB, -- Array of {bedrooms, count} objects
    taxes DECIMAL(10,2),
    property_type VARCHAR(100),
    listing_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    source VARCHAR(50) DEFAULT 'mls',
    raw_data JSONB, -- Store the original JSON data
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comps table (comparable properties)
CREATE TABLE comps (
    id SERIAL PRIMARY KEY,
    list_no VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255),
    town VARCHAR(100),
    state VARCHAR(10) DEFAULT 'MA',
    zip_code VARCHAR(10),
    list_price DECIMAL(12,2),
    units_final INTEGER,
    no_units_mf INTEGER,
    unit_mix JSONB,
    taxes DECIMAL(10,2),
    property_type VARCHAR(100),
    listing_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    source VARCHAR(50) DEFAULT 'comps',
    raw_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Property overrides table
CREATE TABLE property_overrides (
    id SERIAL PRIMARY KEY,
    list_no VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    unit_mix JSONB, -- Override unit mix assumptions
    opex JSONB, -- Override OPEX assumptions
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(list_no, user_id)
);

-- Data source tracking table
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'mls', 'bha', 'external', 'manual'
    url VARCHAR(500),
    api_key_hash VARCHAR(255), -- Hashed API key for security
    last_sync_at TIMESTAMP,
    sync_frequency VARCHAR(50), -- 'hourly', 'daily', 'weekly', 'manual'
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data sync logs table
CREATE TABLE data_sync_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_created_at ON saved_searches(created_at);

-- Data-related indexes
CREATE INDEX idx_rents_zip_code ON rents(zip_code);
CREATE INDEX idx_rents_town ON rents(town);
CREATE INDEX idx_rents_source ON rents(source);
CREATE INDEX idx_listings_list_no ON listings(list_no);
CREATE INDEX idx_listings_zip_code ON listings(zip_code);
CREATE INDEX idx_listings_town ON listings(town);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_comps_list_no ON comps(list_no);
CREATE INDEX idx_comps_zip_code ON comps(zip_code);
CREATE INDEX idx_property_overrides_list_no ON property_overrides(list_no);
CREATE INDEX idx_property_overrides_user_id ON property_overrides(user_id);
CREATE INDEX idx_data_sources_name ON data_sources(name);
CREATE INDEX idx_data_sources_type ON data_sources(type);
CREATE INDEX idx_data_sync_logs_source_id ON data_sync_logs(source_id);
CREATE INDEX idx_data_sync_logs_status ON data_sync_logs(status);
CREATE INDEX idx_data_sync_logs_started_at ON data_sync_logs(started_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- User-related triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data-related triggers
CREATE TRIGGER update_rents_updated_at BEFORE UPDATE ON rents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comps_updated_at BEFORE UPDATE ON comps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_overrides_updated_at BEFORE UPDATE ON property_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA SOURCES
-- ============================================================================

INSERT INTO data_sources (name, type, sync_frequency, metadata) VALUES
('bha-rents', 'bha', 'weekly', '{"description": "BHA Comprehensive Rent Data", "source_file": "bha-rents-comprehensive.json"}'),
('mls-listings', 'mls', 'daily', '{"description": "MLS Property Listings", "source_file": "listings.json"}'),
('comps-data', 'external', 'weekly', '{"description": "Comparable Properties", "source_file": "comps.json"}'),
('manual-overrides', 'manual', 'manual', '{"description": "User-defined Property Overrides", "source_file": "overrides.json"}')
ON CONFLICT (name) DO NOTHING;

