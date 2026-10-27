// Les 14 opérations du contrat, déclarées dans le code. Ajouter une route = l'ajouter ici, régénérer l'OpenAPI.
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  ErrorBody,
  ExpenseNote,
  InternalError,
  ManagerAssignment,
  Problem,
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
// Une erreur a deux représentations (ADR 0005) : `{ error }` par défaut, RFC 9457 si le client envoie
// `Accept: application/problem+json`.
const failure = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema }, 'application/problem+json': { schema: Problem } },
})
const errors = {
  400: failure(ErrorBody, 'Champs invalides'),
  401: failure(ErrorBody, 'Pas de session, ou rôle insuffisant pour les routes manager'),
  403: failure(ErrorBody, 'Pas de session ou rôle autre que hr_admin'),
  404: failure(ErrorBody, "Introuvable ou hors du périmètre de l'appelant"),
  409: failure(ErrorBody, 'Note déjà décidée, ou manager invalide (y compris un corps illisible)'),
  500: failure(InternalError, 'Erreur inattendue'),
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
            // La spec décrit ce que l'app accepte déjà (validation du domaine) : précision, pas changement de contrat.
            // Pas de motif strict : l'app lit le montant avec parseFloat depuis l'origine (« 8* » vaut 8). Le durcir
            // changerait un succès en erreur : question au prof (docs/plan/QUESTIONS.md, montant laxiste).
            amount: z
              .string()
              .openapi({ description: 'Nombre strictement positif, au plus 99 999 999,99', example: '42.50' }),
            expenseDate: z.iso.date().openapi({ description: 'Date du calendrier, AAAA-MM-JJ', example: '2026-10-01' }),
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
  const who = kind === 'manager' ? 'des subordonnés directs' : "des auteurs sans manager de l'entreprise (employés, managers racine, autres RH), jamais les siennes"
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
        kind === 'manager' ? "d'un subordonné" : "d'un auteur sans manager"
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
    summary: `URL signée du reçu d'une note ${kind === 'manager' ? "d'un subordonné" : "d'un auteur sans manager"}`,
    request: { params: noteId },
    responses: { 200: json(ReceiptUrl, 'URL signée, valable 5 minutes'), ...pick(denied, 404, 500) },
  })
}

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
