// Adaptateur des événements métier : une ligne JSON par événement, comme les journaux d'API (docs/slo.md, SLI métier).
// Champs bornés (pas d'identifiant dans les valeurs agrégées) pour qu'un collecteur puisse compter sans exploser.
import { log } from '@/lib/logger'
import type { NoteEvents } from '../ports'

export const logNoteEvents: NoteEvents = {
  submitted() {
    log('info', 'note soumise', { event: 'note.submitted' })
  },
  decided({ decision, approver, delaySeconds }) {
    log('info', 'note décidée', { event: 'note.decided', decision, approver, delaySeconds })
  },
}
