// Adaptateur des événements métier vers les métriques Prometheus (T-0021) : compteurs de notes soumises et décidées,
// histogramme du délai de décision. Les labels restent bornés (décision, type de valideur), sans identifiant.
import { recordNoteDecided, recordNoteSubmitted } from '@/lib/metrics'
import type { NoteEvents } from '../ports'

export const metricNoteEvents: NoteEvents = {
  submitted() {
    recordNoteSubmitted()
  },
  decided({ decision, approver, delaySeconds }) {
    recordNoteDecided(decision, approver, delaySeconds)
  },
}
