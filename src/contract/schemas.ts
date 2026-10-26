// Contrat de l'API déclaré dans le code (ADR 0001) : les schémas Zod sont la source, docs/openapi.yaml en est généré
// (`npm run contract:generate`) et la moulinette (S5) vérifie qu'il est à jour.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

const ExpenseNoteStatus = z.enum(['pending', 'approved', 'rejected']).openapi('ExpenseNoteStatus')

export const ExpenseNote = z
  .strictObject({
    id: z.uuid(),
    userId: z.uuid(),
    amount: z.number().positive(),
    expenseDate: z.iso.date(),
    description: z.string(),
    receiptKey: z.string().openapi({ description: 'Clé de stockage du reçu (prévisible : faille SEC-13)' }),
    status: ExpenseNoteStatus,
    createdAt: z.iso.datetime(),
  })
  .openapi('ExpenseNote')

const Role = z.enum(['employee', 'manager', 'hr_admin'])

export const User = z
  .strictObject({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: Role,
    managerId: z.uuid().nullable(),
  })
  .openapi('User')

export const ReceiptUrl = z.strictObject({ url: z.url() }).openapi('ReceiptUrl')

export const ReceiptSuggestion = z
  .strictObject({ amount: z.number().optional(), expenseDate: z.iso.date().optional() })
  .openapi('ReceiptSuggestion')

export const ErrorBody = z.strictObject({ error: z.string() }).openapi('Error')

export const InternalError = z
  .strictObject({
    error: z.string(),
    errorId: z.uuid().optional().openapi({ description: "Identifiant de l'erreur dans les journaux" }),
    stack: z.string().max(0).optional().openapi({ description: 'Conservé pour le contrat, toujours vide (SEC-07)' }),
  })
  .openapi('InternalError', { description: 'Message générique ; le détail reste dans les journaux du serveur (SEC-07).' })

// RFC 9457 (ADR 0005) : servi quand le client envoie `Accept: application/problem+json`. `error` est gardé en membre
// d'extension ; pour une erreur 500, `errorId` et `stack` (vide) aussi.
export const Problem = z
  .strictObject({
    type: z.string().openapi({ description: 'Identifiant stable du type de problème', example: 'urn:expense-io:problem:not-found' }),
    title: z.string().openapi({ description: 'Résumé lisible du type de problème' }),
    status: z.number().int().openapi({ description: 'Égal au code HTTP de la réponse' }),
    detail: z.string().openapi({ description: 'Explication propre à cette occurrence' }),
    error: z.string().openapi({ description: 'Même texte que `detail`, gardé pour les clients du format historique' }),
    errorId: z.uuid().optional().openapi({ description: "Erreur 500 : identifiant dans les journaux" }),
    stack: z.string().max(0).optional().openapi({ description: 'Erreur 500 : toujours vide (SEC-07)' }),
  })
  .openapi('Problem', { description: 'Problem Details (RFC 9457), servi en application/problem+json sur demande.' })

export const ManagerAssignment = z.object({ managerId: z.uuid().nullable() })

export type ExpenseNoteJson = z.infer<typeof ExpenseNote>
export type UserJson = z.infer<typeof User>
