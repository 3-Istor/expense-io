-- Up Migration
-- SEC-13 (T-0001) : le fichier du reçu est stocké sous une clé opaque (UUID), séparée de `receipt_key`, la référence
-- exposée par l'API dont le format `receipts/<n>.<ext>` ne change pas (contrat). Les notes existantes n'ont pas de
-- clé de stockage : leur fichier reste sous `receipt_key`, lu tel quel.
ALTER TABLE expense_notes ADD COLUMN storage_key text;

-- Down Migration
ALTER TABLE expense_notes DROP COLUMN storage_key;
