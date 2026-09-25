-- SMB-Agent-OS Database Initialization Script
-- Mirrors 001_phase1_schema.sql

\i /docker-entrypoint-initdb.d/../apps/api/src/db/migrations/001_phase1_schema.sql;
