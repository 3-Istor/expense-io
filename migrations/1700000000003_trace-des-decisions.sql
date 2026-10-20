-- Up Migration
-- Trace des décisions (docs/vision.md, workflow) : qui a validé ou rejeté une note, et quand.
-- Non exposée dans le contrat de l'API pour l'instant ; elle prépare la validation finance et l'audit.
ALTER TABLE expense_notes
  ADD COLUMN decided_by uuid REFERENCES users(id),
  ADD COLUMN decided_at timestamptz;

-- Down Migration
ALTER TABLE expense_notes
  DROP COLUMN decided_by,
  DROP COLUMN decided_at;
