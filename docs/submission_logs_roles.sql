-- Create L1 (Naive User) and L2 (Authority) roles with strict privileges
-- Replace passwords with secure values in production

-- Create roles
CREATE ROLE l1_naive_user LOGIN PASSWORD 'strong_l1_password';
CREATE ROLE l2_authority LOGIN PASSWORD 'strong_l2_password';

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO l1_naive_user, l2_authority;

-- L1: INSERT only
GRANT INSERT ON submission_logs TO l1_naive_user;
REVOKE SELECT, UPDATE, DELETE ON submission_logs FROM l1_naive_user;

-- L2: SELECT only
GRANT SELECT ON submission_logs TO l2_authority;
REVOKE INSERT, UPDATE, DELETE ON submission_logs FROM l2_authority;