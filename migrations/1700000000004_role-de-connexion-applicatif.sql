-- Up Migration
-- SEC-05, fin du correctif : l'application se connecte avec un compte dédié, ni superutilisateur ni BYPASSRLS.
-- Il hérite des droits de `expense_app` (qu'il endosse dans chaque transaction métier) et peut seulement, hors
-- transaction métier, lire les comptes (connexion) et en créer (inscription). L'administrateur (`expense`) ne sert
-- plus qu'aux migrations et au seed (DATABASE_ADMIN_URL).
-- Mot de passe de DÉVELOPPEMENT, public comme celui de docker-compose.yml. En production :
--   ALTER ROLE expense_app_login PASSWORD '<secret>';  et le reporter dans DATABASE_URL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_app_login') THEN
    CREATE ROLE expense_app_login LOGIN PASSWORD 'expense_app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
      IN ROLE expense_app;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE expense_io TO expense_app_login;
GRANT INSERT ON users, companies TO expense_app_login;

-- Down Migration
REVOKE INSERT ON users, companies FROM expense_app_login;
REVOKE CONNECT ON DATABASE expense_io FROM expense_app_login;
DROP ROLE IF EXISTS expense_app_login;
