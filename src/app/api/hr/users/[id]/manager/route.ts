import type { UserJson } from '@/contract/schemas'
import { identity } from '@/modules/identity'
import { requireUser } from '@/modules/identity/session'
import { handle } from '@/shared/http'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(403, async () => {
    const me = await requireUser()
    const { id } = await params
    // Corps illisible → undefined, refusé par le domaine (400, SEC-09).
    const body = await request.json().catch(() => undefined)
    return Response.json((await identity.assignManager(me, id, body)) satisfies UserJson)
  })
}
