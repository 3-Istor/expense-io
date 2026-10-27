// Règles sur les reçus : types acceptés, taille maximale, nom de stockage.

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export type ReceiptRefusal = 'type-not-allowed' | 'too-large'

export function checkReceipt(receipt: { type: string; size: number }): ReceiptRefusal | null {
  // Object.hasOwn et non `in` : `in` accepterait toString ou constructor (prototype).
  if (!Object.hasOwn(EXTENSION_BY_MIME, receipt.type)) return 'type-not-allowed'
  if (receipt.size > MAX_RECEIPT_BYTES) return 'too-large'
  return null
}

/** Référence du reçu exposée par l'API (`receiptKey`) : format du contrat d'origine, inchangé. */
export function receiptKeyFor(receiptSeq: number, mimeType: string): string {
  return `receipts/${receiptSeq}${EXTENSION_BY_MIME[mimeType] ?? ''}`
}

/**
 * Clé sous laquelle le fichier est réellement stocké (SEC-13) : un identifiant opaque fourni par l'application
 * (UUID v4). Elle ne révèle pas le volume et ne se déduit pas de `receiptKey` ni de la clé d'une autre note.
 */
export function storageKeyFor(opaqueId: string, mimeType: string): string {
  return `receipts/${opaqueId}${EXTENSION_BY_MIME[mimeType] ?? ''}`
}

/** Clé à lire : la clé opaque si la note en a une, sinon `receiptKey` (notes créées avant SEC-13). */
export function storedAt(note: { receiptKey: string; storageKey?: string | null }): string {
  return note.storageKey ?? note.receiptKey
}
