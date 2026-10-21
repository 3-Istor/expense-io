import type { UserJson } from '@/contract/schemas'
import { identity } from '@/modules/identity'
import { requireUser } from '@/modules/identity/session'
import { handle } from '@/shared/http'

export async function GET() {
  return handle(403, async () => {
    const me = await requireUser()
    return Response.json((await identity.directory(me)) satisfies UserJson[])
  })
}
