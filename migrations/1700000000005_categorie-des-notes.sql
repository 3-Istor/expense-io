-- Up Migration
-- Catégorie d'une note, pour les plafonds par catégorie. Les notes existantes passent en « autre ».
ALTER TABLE expense_notes
  ADD COLUMN category text NOT NULL DEFAULT 'autre'
    CHECK (category IN ('transport', 'repas', 'hebergement', 'autre'));

-- Down Migration
ALTER TABLE expense_notes DROP COLUMN category;
