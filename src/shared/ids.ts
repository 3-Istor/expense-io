// Identifiants : un id qui n'a pas la forme d'un UUID ne peut désigner aucune ligne. On le traite comme introuvable
// AVANT la base, au lieu de laisser PostgreSQL lever une erreur (500) : trouvé par fuzzing (Schemathesis).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: string): boolean => UUID.test(value)
