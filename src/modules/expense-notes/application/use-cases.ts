// Cas d'usage du module : ils appliquent les règles du domaine et ne parlent qu'aux ports.
import { conflict, denied, invalid, notFound } from '@/shared/app-error'
import { approverKind, type ApproverKind, type Role } from '../domain/approvers'
import { checkDecision, validateNewNote, type Decision, type ExpenseNote } from '../domain/expense-note'
import { checkReceipt, MAX_RECEIPT_BYTES, receiptKeyFor } from '../domain/receipt'
import { parseSort } from '../domain/sort'
import type { Caller, ExpenseNoteRepository, ReceiptReader, ReceiptStorage } from '../ports'

export interface Deps {
  notes: ExpenseNoteRepository
  storage: ReceiptStorage
  reader: ReceiptReader
}

export interface ReceiptFile {
  type: string
  size: number
  bytes: () => Promise<Buffer>
}

/** Appelant authentifié avec son rôle (fourni par le module identity). */
export interface Actor extends Caller {
  role: Role
}

const RECEIPT_MESSAGES = {
  'type-not-allowed': 'Type de fichier non autorisé pour le reçu',
  'too-large': 'Fichier trop volumineux',
} as const

export function expenseNoteUseCases({ notes, storage, reader }: Deps) {
  function asApprover(actor: Actor, expected: ApproverKind): ApproverKind {
    const kind = approverKind(actor.role, expected)
    if (!kind) throw denied()
    return kind
  }

  return {
    async listOwn(caller: Caller, sortParam: string | null): Promise<ExpenseNote[]> {
      // Contrat gelé (décision de Brian) : un tri hors liste n'est pas une erreur, il est ignoré (tri par défaut).
      // La valeur reçue n'entre jamais dans le SQL (SEC-01).
      return notes.listOwn(caller, parseSort(sortParam) ?? parseSort(null)!)
    },

    /** Le reçu est stocké AVANT la note : pas de note sans reçu si le stockage échoue (SEC-12). */
    async create(
      caller: Caller,
      input: { amount: unknown; expenseDate: unknown; description: unknown; category?: unknown; receipt: ReceiptFile | null },
    ): Promise<ExpenseNote> {
      const fields = validateNewNote(input)
      if (!fields || !input.receipt) throw invalid()
      const refusal = checkReceipt(input.receipt)
      if (refusal) throw invalid(RECEIPT_MESSAGES[refusal])
      const receiptSeq = await notes.reserveReceiptSeq(caller)
      const receiptKey = receiptKeyFor(receiptSeq, input.receipt.type)
      await storage.upload(receiptKey, await input.receipt.bytes(), input.receipt.type)
      return notes.insert(caller, { ...fields, receiptKey, receiptSeq })
    },

    async ownReceiptUrl(caller: Caller, noteId: string): Promise<string> {
      const note = await notes.findOwn(caller, noteId)
      if (!note) throw notFound()
      return storage.signedUrl(note.receiptKey)
    },

    /** OCR borné en taille ici, en durée et en concurrence dans l'adaptateur (SEC-11). */
    async suggest(receipt: ReceiptFile | null) {
      if (!receipt) throw invalid()
      if (receipt.size > MAX_RECEIPT_BYTES) throw invalid(RECEIPT_MESSAGES['too-large'])
      return reader.suggest({ data: await receipt.bytes(), mimeType: receipt.type })
    },

    async listPending(actor: Actor, expected: ApproverKind): Promise<ExpenseNote[]> {
      return notes.listPendingInScope(actor, asApprover(actor, expected))
    },

    async decide(actor: Actor, expected: ApproverKind, noteId: string, decision: Decision): Promise<ExpenseNote> {
      const kind = asApprover(actor, expected)
      const note = await notes.findInScope(actor, kind, noteId)
      if (!note) throw notFound()
      const refusal = checkDecision(note, decision, actor.userId)
      // Sa propre note n'est jamais dans le périmètre (404, comportement du contrat) ; la règle reste écrite ici.
      if (refusal === 'self-decision') throw notFound()
      if (refusal === 'already-decided') throw conflict('Already decided')
      const saved = await notes.saveDecision(actor, kind, noteId, decision)
      if (!saved) throw conflict('Already decided') // décidée entre-temps par une autre requête (SEC-08)
      return saved
    },

    async approverReceiptUrl(actor: Actor, expected: ApproverKind, noteId: string): Promise<string> {
      const note = await notes.findInScope(actor, asApprover(actor, expected), noteId)
      if (!note) throw notFound()
      return storage.signedUrl(note.receiptKey)
    },
  }
}
