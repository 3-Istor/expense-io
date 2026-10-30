-- Up Migration
-- Répétition 4 : le RH marque remboursée une note validée, pour que l'auteur sache que l'argent est parti.
-- 1. Nouveau statut `reimbursed` (contrat 1.2.0, ADR 0006).
-- 2. Trace : qui a remboursé, quand (comme decided_by / decided_at), non exposée par l'API.
-- 3. RLS au plus juste : un RH lit et rembourse les notes validées (ou déjà remboursées) des autres membres de son
--    entreprise, avec ou sans manager ; jamais les siennes. CETTE politique ne permet que approved → reimbursed, en son
--    propre nom. Elle s'ajoute (OR) aux politiques de mise à jour existantes (manager, RH des auteurs sans manager), qui
--    ne bornent pas le statut : la transition y reste garantie par le SQL applicatif seul (ticket T-0024).
--    Le RH ne lit toujours pas les notes en attente ou rejetées des employés qui ont un manager.
ALTER TABLE expense_notes DROP CONSTRAINT expense_notes_status_check;
ALTER TABLE expense_notes ADD CONSTRAINT expense_notes_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed'));

ALTER TABLE expense_notes
  ADD COLUMN reimbursed_by uuid REFERENCES users(id),
  ADD COLUMN reimbursed_at timestamptz;

CREATE POLICY expense_notes_hr_reimburse_select ON expense_notes FOR SELECT
  USING (
    expense_notes.status IN ('approved', 'reimbursed')
    AND expense_notes.user_id <> app_current_user_id()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.company_id = app_current_company_id())
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  );

CREATE POLICY expense_notes_hr_reimburse_update ON expense_notes FOR UPDATE
  USING (
    expense_notes.status = 'approved'
    AND expense_notes.user_id <> app_current_user_id()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.company_id = app_current_company_id())
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = app_current_user_id() AND hr.role = 'hr_admin')
  )
  WITH CHECK (
    expense_notes.status = 'reimbursed'
    AND expense_notes.reimbursed_by = app_current_user_id()
    AND expense_notes.user_id <> app_current_user_id()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.company_id = app_current_company_id())
  );

-- Down Migration
DROP POLICY expense_notes_hr_reimburse_update ON expense_notes;
DROP POLICY expense_notes_hr_reimburse_select ON expense_notes;
-- Refus tant qu'une note est remboursée : la repasser en `approved` effacerait la preuve du paiement et permettrait de
-- la rembourser deux fois (relecteur sécurité). Archiver ou traiter ces lignes à la main avant de redescendre.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM expense_notes WHERE status = 'reimbursed') THEN
    RAISE EXCEPTION 'Des notes sont remboursées : migration 0008 non réversible sans traitement manuel';
  END IF;
END
$$;
ALTER TABLE expense_notes DROP COLUMN reimbursed_by, DROP COLUMN reimbursed_at;
ALTER TABLE expense_notes DROP CONSTRAINT expense_notes_status_check;
ALTER TABLE expense_notes ADD CONSTRAINT expense_notes_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));
