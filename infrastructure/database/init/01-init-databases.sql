-- Initialize databases for Campaign Manager

-- Create main application database (already created by POSTGRES_DB)
-- CREATE DATABASE campaign_manager;

-- Create scraper service database
CREATE DATABASE scraper_db;

-- Create test database
CREATE DATABASE campaign_manager_test;

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE campaign_manager TO postgres;
GRANT ALL PRIVILEGES ON DATABASE scraper_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE campaign_manager_test TO postgres;

-- Connect to main database and create extensions
\c campaign_manager;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS if needed for location data
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for better indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Connect to scraper database and create extensions
\c scraper_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Connect to test database and create extensions
\c campaign_manager_test;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;