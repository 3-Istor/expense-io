-- Up Migration
-- T-0020 : historique des changements de manager. Un RH pouvait détacher un employé de son manager, valider sa note,
-- puis le rattacher de nouveau, sans autre trace que `decided_by`. Chaque changement effectif est désormais inscrit :
-- qui, quand, avant, après. Ajout seul : le rôle applicatif peut insérer et lire, jamais modifier ni effacer.
CREATE TABLE manager_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  previous_manager_id uuid REFERENCES users(id),
  new_manager_id uuid REFERENCES users(id),
  changed_by uuid NOT NULL REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX manager_changes_user_idx ON manager_changes (user_id, changed_at DESC);

ALTER TABLE manager_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_changes FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON manager_changes TO expense_app;

-- Écrit seulement par un RH, pour son entreprise, en son propre nom.
CREATE POLICY manager_changes_hr_insert ON manager_changes FOR INSERT
  WITH CHECK (
    company_id = app_current_company_id()
    AND changed_by = app_current_user_id()
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Lu seulement par un RH de la même entreprise.
CREATE POLICY manager_changes_hr_select ON manager_changes FOR SELECT
  USING (
    company_id = app_current_company_id()
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

-- Down Migration
DROP TABLE manager_changes;
