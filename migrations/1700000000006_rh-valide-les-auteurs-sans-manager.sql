-- Up Migration
-- T-0014 : le RH valide la note de tout auteur sans manager de son entreprise (employé, manager ou autre RH), plus
-- seulement celle des managers racine. Sinon ces notes restent en attente pour toujours (cours 4). Jamais sa propre
-- note : la RLS le refuse aussi, en plus du dépôt (SEC-06, défense en profondeur).

DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

CREATE POLICY expense_notes_hr_no_manager_select ON expense_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

CREATE POLICY expense_notes_hr_no_manager_update ON expense_notes FOR UPDATE
  USING (
    expense_notes.user_id <> app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Down Migration
DROP POLICY expense_notes_hr_no_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_no_manager_update ON expense_notes;

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
