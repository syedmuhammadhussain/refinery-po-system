-- ============================================================
-- Refinery PO System – Database Bootstrap
-- Creates isolated databases per microservice boundary
--
-- NOTE: Docker entrypoint runs this ONLY on first start
--       (when the pgdata volume is empty).
--       If you need to re-run: docker-compose down -v
-- ============================================================

-- Create service-specific databases
-- (No OWNER clause — defaults to the POSTGRES_USER from docker-compose)
CREATE DATABASE catalog_db;
CREATE DATABASE procurement_db;

-- Enable extensions on catalog_db
\connect catalog_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable extensions on procurement_db
\connect procurement_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
