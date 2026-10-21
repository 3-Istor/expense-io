// Adaptateurs du stockage des reçus (S3) et de leur lecture (OCR Tesseract, borné : SEC-11).
import { suggestFields } from '@/lib/ocr'
import { getReceiptUrl, uploadReceipt } from '@/lib/storage'
import type { ReceiptReader, ReceiptStorage } from '../ports'

export const s3ReceiptStorage: ReceiptStorage = {
  upload: uploadReceipt,
  signedUrl: (key) => getReceiptUrl(key),
}

export const tesseractReceiptReader: ReceiptReader = {
  suggest: suggestFields,
}
