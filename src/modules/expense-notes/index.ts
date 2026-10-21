// API publique du module expense-notes : les routes n'importent que ce fichier.
import { expenseNoteUseCases } from './application/use-cases'
import { pgExpenseNoteRepository } from './infrastructure/pg-expense-note-repository'
import { s3ReceiptStorage, tesseractReceiptReader } from './infrastructure/receipt-adapters'

export const expenseNotes = expenseNoteUseCases({
  notes: pgExpenseNoteRepository,
  storage: s3ReceiptStorage,
  reader: tesseractReceiptReader,
})
