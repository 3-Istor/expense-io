-- Up Migration
-- SEC-05 : la RLS devient réelle.
-- 1. Un rôle applicatif sans connexion, sans superuser ni BYPASSRLS : l'application l'endosse dans chaque
--    transaction métier (SET LOCAL ROLE, voir src/lib/db.ts). Aucun mot de passe : rien de secret ici.
-- 2. Chaque politique des notes compare aussi l'entreprise de l'auteur à celle de l'appelant.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_app') THEN
    CREATE ROLE expense_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO expense_app;
GRANT SELECT, UPDATE (manager_id) ON users TO expense_app;
GRANT SELECT ON companies TO expense_app;
GRANT SELECT, INSERT, UPDATE ON expense_notes TO expense_app;
GRANT USAGE ON SEQUENCE expense_notes_receipt_seq_seq TO expense_app;

-- Contexte de la transaction, posé par withUserScope.
CREATE FUNCTION app_current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.current_user_id', true), '')::uuid $$;

-- SECURITY DEFINER : lit l'entreprise de l'appelant sans dépendre des droits du rôle courant.
CREATE FUNCTION app_current_company_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT company_id FROM users WHERE id = app_current_user_id() $$;

DROP POLICY expense_notes_owner_select ON expense_notes;
DROP POLICY expense_notes_owner_insert ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

CREATE POLICY expense_notes_owner_select ON expense_notes FOR SELECT
  USING (
    user_id = app_current_user_id()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.company_id = app_current_company_id())
  );

CREATE POLICY expense_notes_owner_insert ON expense_notes FOR INSERT
  WITH CHECK (
    user_id = app_current_user_id()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.company_id = app_current_company_id())
  );

CREATE POLICY expense_notes_manager_select ON expense_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id = app_current_user_id()
        AND u.company_id = app_current_company_id()
    )
  );

CREATE POLICY expense_notes_manager_update ON expense_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id = app_current_user_id()
        AND u.company_id = app_current_company_id()
    )
  );

CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.role = 'manager' AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.role = 'manager' AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Down Migration
DROP POLICY expense_notes_owner_select ON expense_notes;
DROP POLICY expense_notes_owner_insert ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

CREATE POLICY expense_notes_owner_select ON expense_notes FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
CREATE POLICY expense_notes_owner_insert ON expense_notes FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
CREATE POLICY expense_notes_manager_select ON expense_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_manager_update ON expense_notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid
      AND hr.role = 'hr_admin'));
CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid
      AND hr.role = 'hr_admin'));

DROP FUNCTION app_current_company_id();
DROP FUNCTION app_current_user_id();
REVOKE ALL ON expense_notes, users, companies FROM expense_app;
REVOKE USAGE ON SEQUENCE expense_notes_receipt_seq_seq FROM expense_app;
REVOKE USAGE ON SCHEMA public FROM expense_app;
