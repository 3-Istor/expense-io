// Les 14 opérations du contrat, déclarées dans le code. Ajouter une route = l'ajouter ici, régénérer l'OpenAPI.
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  ErrorBody,
  ExpenseNote,
  InternalError,
  ManagerAssignment,
  ReceiptSuggestion,
  ReceiptUrl,
  User,
} from './schemas'

export const registry = new OpenAPIRegistry()

registry.registerComponent('securitySchemes', 'session', {
  type: 'apiKey',
  in: 'cookie',
  name: 'authjs.session-token',
  description: 'Session Auth.js (JWT chiffré), obtenue par /api/auth/callback/credentials.',
})

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema } },
})
const errors = {
  400: json(ErrorBody, 'Champs invalides'),
  401: json(ErrorBody, 'Pas de session, ou rôle insuffisant pour les routes manager'),
  403: json(ErrorBody, 'Pas de session ou rôle autre que hr_admin'),
  404: json(ErrorBody, "Introuvable ou hors du périmètre de l'appelant"),
  409: json(ErrorBody, 'Note déjà décidée, ou manager invalide (y compris un corps illisible)'),
  500: json(InternalError, 'Erreur inattendue'),
}
const pick = <K extends keyof typeof errors>(...codes: K[]) => Object.fromEntries(codes.map((c) => [c, errors[c]]))

const noteId = z.object({ id: z.uuid() })
const notes = z.array(ExpenseNote)
const receipt = z.string().openapi({ contentMediaType: 'application/octet-stream' } as never)

registry.registerPath({
  method: 'get',
  path: '/api/expense-notes',
  tags: ['notes'],
  operationId: 'listMyExpenseNotes',
  summary: "Liste les notes de l'appelant",
  request: {
    query: z.object({
      sort: z.string().optional().openapi({
        description:
          'Tri, `<colonne>` ou `<colonne> ASC|DESC` (insensible à la casse), colonnes created_at, amount, ' +
          'expense_date, status, description. Par défaut `created_at DESC`, appliqué aussi à toute autre valeur.',
        example: 'amount DESC',
      }),
    }),
  },
  responses: { 200: json(notes, "Notes de l'appelant"), ...pick(401, 500) },
})

registry.registerPath({
  method: 'post',
  path: '/api/expense-notes',
  tags: ['notes'],
  operationId: 'createExpenseNote',
  summary: 'Crée une note avec son reçu',
  request: {
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: z.object({
            amount: z.string().openapi({ description: 'Nombre strictement positif' }),
            expenseDate: z.string().openapi({ description: 'Date AAAA-MM-JJ' }),
            description: z.string().min(1),
            receipt: receipt.openapi({ description: 'png, jpeg, webp ou pdf, 10 Mo au plus' }),
          }),
        },
      },
    },
  },
  responses: { 201: json(ExpenseNote, 'Note créée, en attente'), ...pick(400, 401, 500) },
})

registry.registerPath({
  method: 'get',
  path: '/api/expense-notes/{id}/receipt-url',
  tags: ['notes'],
  operationId: 'getMyReceiptUrl',
  summary: "URL signée du reçu d'une de ses notes",
  request: { params: noteId },
  responses: { 200: json(ReceiptUrl, 'URL signée, valable 5 minutes'), ...pick(401, 404, 500) },
})

registry.registerPath({
  method: 'post',
  path: '/api/expense-notes/receipt-suggestion',
  tags: ['notes'],
  operationId: 'suggestFromReceipt',
  summary: 'Suggère montant et date à partir du reçu (OCR)',
  request: {
    body: { required: true, content: { 'multipart/form-data': { schema: z.object({ receipt }) } } },
  },
  responses: { 200: json(ReceiptSuggestion, 'Suggestion, éventuellement vide'), ...pick(400, 401, 500) },
})

for (const kind of ['manager', 'hr'] as const) {
  const denied = kind === 'manager' ? 401 : 403
  const who = kind === 'manager' ? 'des subordonnés directs' : "des managers racine de l'entreprise"
  const tag = kind
  const prefix = kind === 'manager' ? 'manager' : 'hr'

  registry.registerPath({
    method: 'get',
    path: `/api/${kind}/expense-notes`,
    tags: [tag],
    operationId: kind === 'manager' ? 'listTeamPendingNotes' : 'listRootManagerPendingNotes',
    summary: `Notes en attente ${who}`,
    responses: { 200: json(notes, "Notes en attente, plus anciennes d'abord"), ...pick(denied, 500) },
  })

  for (const action of ['approve', 'reject'] as const) {
    registry.registerPath({
      method: 'post',
      path: `/api/${kind}/expense-notes/{id}/${action}`,
      tags: [tag],
      operationId: `${prefix}${action === 'approve' ? 'Approve' : 'Reject'}Note`,
      summary: `${action === 'approve' ? 'Approuve' : 'Rejette'} la note ${
        kind === 'manager' ? "d'un subordonné" : "d'un manager racine"
      }`,
      request: { params: noteId },
      responses: { 200: json(ExpenseNote, 'Note mise à jour'), ...pick(denied, 404, 409, 500) },
    })
  }

  registry.registerPath({
    method: 'get',
    path: `/api/${kind}/expense-notes/{id}/receipt-url`,
    tags: [tag],
    operationId: `${prefix}GetReceiptUrl`,
    summary: `URL signée du reçu d'une note ${kind === 'manager' ? "d'un subordonné" : "d'un manager racine"}`,
    request: { params: noteId },
    responses: { 200: json(ReceiptUrl, 'URL signée, valable 5 minutes'), ...pick(denied, 404, 500) },
  })
}

registry.registerPath({
  method: 'get',
  path: '/api/hr/expense-notes/export',
  tags: ['hr'],
  operationId: 'exportRootManagerNotes',
  summary: "Exporte en CSV les notes des managers racine de l'entreprise, tous statuts",
  responses: {
    200: {
      description: 'CSV (UTF-8, séparateur virgule), une ligne par note ; cellules neutralisées contre l\'injection de formules',
      content: { 'text/csv': { schema: z.string() } },
    },
    ...pick(403, 500),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/hr/users',
  tags: ['hr'],
  operationId: 'listCompanyUsers',
  summary: "Employés et managers de l'entreprise, triés par nom",
  responses: { 200: json(z.array(User), 'Annuaire'), ...pick(403, 500) },
})

registry.registerPath({
  method: 'put',
  path: '/api/hr/users/{id}/manager',
  tags: ['hr'],
  operationId: 'assignManager',
  summary: 'Rattache un utilisateur à un manager, ou le détache (null)',
  request: {
    params: z.object({ id: z.uuid() }),
    body: { required: true, content: { 'application/json': { schema: ManagerAssignment } } },
  },
  responses: { 200: json(User, 'Utilisateur mis à jour'), ...pick(403, 404, 409, 500) },
})
