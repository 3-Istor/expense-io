// API publique du module expense-notes : les routes n'importent que ce fichier.
import { expenseNoteUseCases } from './application/use-cases'
import { logNoteEvents } from './infrastructure/log-note-events'
import { metricNoteEvents } from './infrastructure/metric-note-events'
import { pgExpenseNoteRepository } from './infrastructure/pg-expense-note-repository'
import { s3ReceiptStorage, tesseractReceiptReader } from './infrastructure/receipt-adapters'

export const expenseNotes = expenseNoteUseCases({
  notes: pgExpenseNoteRepository,
  storage: s3ReceiptStorage,
  reader: tesseractReceiptReader,
  // Chaque événement métier va aux journaux et aux métriques (T-0021).
  events: {
    submitted() {
      logNoteEvents.submitted()
      metricNoteEvents.submitted()
    },
    decided(event) {
      logNoteEvents.decided(event)
      metricNoteEvents.decided(event)
    },
  },
})
