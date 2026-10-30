-- Up Migration
-- T-0024 (vu en répétition 4) : les politiques de mise à jour des valideurs ne bornaient pas le statut. Sous le rôle
-- applicatif, un valideur pouvait réécrire une note déjà décidée ; seul le SQL de l'application (`status = 'pending'`)
-- l'en empêchait, une injection SQL aurait suffi. La base l'impose maintenant elle-même :
-- - on ne modifie qu'une note en attente (USING) ;
-- - seulement vers « approved » ou « rejected », au nom de l'appelant (`decided_by`), sans sortir du périmètre (WITH CHECK).
ALTER POLICY expense_notes_manager_update ON expense_notes
  USING (
    expense_notes.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id = app_current_user_id()
        AND u.company_id = app_current_company_id()
    )
  )
  WITH CHECK (
    expense_notes.status IN ('approved', 'rejected')
    AND expense_notes.decided_by = app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id = app_current_user_id()
        AND u.company_id = app_current_company_id()
    )
  );

ALTER POLICY expense_notes_hr_no_manager_update ON expense_notes
  USING (
    expense_notes.status = 'pending'
    AND expense_notes.user_id <> app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  )
  WITH CHECK (
    expense_notes.status IN ('approved', 'rejected')
    AND expense_notes.decided_by = app_current_user_id()
    AND expense_notes.user_id <> app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id IS NULL
        AND u.company_id = app_current_company_id()
    )
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Down Migration
-- Retour exact à l'état d'avant : politiques sans WITH CHECK (ALTER POLICY ne sait pas en retirer un).
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_no_manager_update ON expense_notes;

CREATE POLICY expense_notes_manager_update ON expense_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = expense_notes.user_id
        AND u.manager_id = app_current_user_id()
        AND u.company_id = app_current_company_id()
    )
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
