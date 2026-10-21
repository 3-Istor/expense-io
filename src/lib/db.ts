import { Pool, types, type PoolClient } from 'pg'

// OID 1082 = date. Garde la chaîne "YYYY-MM-DD" brute renvoyée par Postgres
// plutôt qu'un objet Date JS calé sur le fuseau local.
types.setTypeParser(1082, (value: string) => value)

declare global {
  var __pgPool: Pool | undefined
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    global.__pgPool = new Pool({ connectionString, max: 20 })
  }
  return global.__pgPool
}

/**
 * Transaction métier dans le contexte de l'utilisateur. Deux protections (SEC-05) :
 * - le rôle `expense_app` (ni superuser ni BYPASSRLS) est endossé : les politiques RLS s'appliquent vraiment ;
 * - l'id de l'appelant est exposé aux politiques, qui en déduisent aussi son entreprise.
 * Les routes gardent leurs propres contrôles : la RLS est une seconde ligne, pas la seule.
 */
export async function withUserScope<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET LOCAL ROLE expense_app')
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId])
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
