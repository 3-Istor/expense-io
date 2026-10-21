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

/** Clé de stockage dérivée du compteur de reçu (format du contrat actuel ; clé opaque : SEC-13, en attente). */
export function receiptKeyFor(receiptSeq: number, mimeType: string): string {
  return `receipts/${receiptSeq}${EXTENSION_BY_MIME[mimeType] ?? ''}`
}
