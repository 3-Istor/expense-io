-- Up Migration
-- T-0020 : historique des changements de manager. Un RH pouvait détacher un employé de son manager, valider sa note,
-- puis le rattacher de nouveau, sans autre trace que `decided_by`. Chaque changement effectif est désormais inscrit :
-- qui, quand, avant, après. Ajout seul : le rôle applicatif peut insérer et lire, jamais modifier ni effacer.
-- Clés étrangères en cascade ou à NULL : l'historique ne bloque jamais la suppression d'un compte ou d'une entreprise
-- par un administrateur (nettoyage de base, droit à l'effacement) ; l'application, elle, ne supprime rien.
CREATE TABLE manager_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  new_manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX manager_changes_user_idx ON manager_changes (user_id, changed_at DESC);

ALTER TABLE manager_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_changes FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON manager_changes TO expense_app;

-- Écrit seulement par un RH, pour son entreprise, en son propre nom, sur des comptes de cette entreprise.
CREATE POLICY manager_changes_hr_insert ON manager_changes FOR INSERT
  WITH CHECK (
    company_id = app_current_company_id()
    AND changed_by = app_current_user_id()
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = manager_changes.user_id AND u.company_id = manager_changes.company_id)
    AND (previous_manager_id IS NULL OR EXISTS (
      SELECT 1 FROM users m WHERE m.id = manager_changes.previous_manager_id AND m.company_id = manager_changes.company_id))
    AND (new_manager_id IS NULL OR EXISTS (
      SELECT 1 FROM users m WHERE m.id = manager_changes.new_manager_id AND m.company_id = manager_changes.company_id))
  );

-- Lu seulement par un RH de la même entreprise.
CREATE POLICY manager_changes_hr_select ON manager_changes FOR SELECT
  USING (
    company_id = app_current_company_id()
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Down Migration
DROP TABLE manager_changes;
