// Configuration d'Umami (T-0028) : mesure d'usage des fonctionnalités côté interface (pages vues, clics sur les boutons
// marqués `data-umami-event`), sans cookie ni donnée personnelle. Désactivé tant que les deux variables ne sont pas
// fixées ; une URL de script qui n'est pas en https, ou un identifiant mal formé, désactive aussi le suivi.
const WEBSITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function umamiConfig(env: Record<string, string | undefined>): { scriptUrl: string; websiteId: string } | null {
  const scriptUrl = env.UMAMI_SCRIPT_URL?.trim()
  const websiteId = env.UMAMI_WEBSITE_ID?.trim()
  if (!scriptUrl || !websiteId || !WEBSITE_ID.test(websiteId)) return null
  try {
    return new URL(scriptUrl).protocol === 'https:' ? { scriptUrl, websiteId } : null
  } catch {
    return null
  }
}
