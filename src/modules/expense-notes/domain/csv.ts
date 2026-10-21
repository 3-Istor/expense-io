// Export CSV : règles pures (échappement RFC 4180 et neutralisation des formules, OWASP « CSV injection »).

const FORMULA_START = /^[=+\-@\t\r]/

/** Une cellule sûre : une formule devient du texte (préfixe « ' »), puis échappement CSV. */
export function csvCell(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) || text.startsWith("'") ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}
