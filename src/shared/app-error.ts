// Erreurs attendues des cas d'usage, indépendantes de HTTP. La couche HTTP (src/shared/http.ts) les traduit en codes.
export type AppErrorKind = 'invalid' | 'denied' | 'not-found' | 'conflict'

export class AppError extends Error {
  constructor(
    readonly kind: AppErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Messages du contrat actuel, conservés à l'identique.
export const invalid = (message = 'Champs invalides') => new AppError('invalid', message)
export const denied = () => new AppError('denied', 'Unauthorized')
export const notFound = () => new AppError('not-found', 'Not found')
export const conflict = (message: string) => new AppError('conflict', message)
