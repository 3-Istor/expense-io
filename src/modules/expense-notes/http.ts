// Adaptateur HTTP du module (côté entrée) : fabriques des routes Next.js de validation, partagées par les routes
// manager et RH. Les codes de refus restent ceux du contrat (401 manager, 403 RH).
import { requireUser } from '@/modules/identity/session'
import { handle, noteJson, type DeniedStatus } from '@/shared/http'
import { expenseNotes } from './index'
import type { ApproverKind } from './domain/approvers'
import type { Decision } from './domain/expense-note'

type Params = { params: Promise<{ id: string }> }
const DENIED_STATUS: Record<ApproverKind, DeniedStatus> = { manager: 401, hr: 403 }

const LIST_OPERATION: Record<ApproverKind, string> = { manager: 'listTeamPendingNotes', hr: 'listRootManagerPendingNotes' }

export function pendingListRoute(kind: ApproverKind) {
  return () =>
    handle(LIST_OPERATION[kind], DENIED_STATUS[kind], async () => {
      const me = await requireUser()
      return Response.json((await expenseNotes.listPending(me, kind)).map(noteJson))
    })
}

export function decisionRoute(kind: ApproverKind, decision: Decision) {
  const operation = `${kind}${decision === 'approved' ? 'Approve' : 'Reject'}Note`
  return (_request: Request, { params }: Params) =>
    handle(operation, DENIED_STATUS[kind], async () => {
      const me = await requireUser()
      const { id } = await params
      return Response.json(noteJson(await expenseNotes.decide(me, kind, id, decision)))
    })
}

export function approverReceiptUrlRoute(kind: ApproverKind) {
  return (_request: Request, { params }: Params) =>
    handle(`${kind}GetReceiptUrl`, DENIED_STATUS[kind], async () => {
      const me = await requireUser()
      const { id } = await params
      return Response.json({ url: await expenseNotes.approverReceiptUrl(me, kind, id) })
    })
}
