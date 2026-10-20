import { auth } from '@/lib/auth'
import { respondError } from '@/lib/errors'
import { OCR_MAX_BYTES, suggestFields } from '@/lib/ocr'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const receipt = formData.get('receipt')
    if (!(receipt instanceof File)) {
      return Response.json({ error: 'Champs invalides' }, { status: 400 })
    }
    if (receipt.size > OCR_MAX_BYTES) {
      return Response.json({ error: 'Fichier trop volumineux' }, { status: 400 })
    }

    const buffer = Buffer.from(await receipt.arrayBuffer())
    const suggestion = await suggestFields({ data: buffer, mimeType: receipt.type })
    return Response.json(suggestion)
  } catch (error) {
    return respondError(error)
  }
}
