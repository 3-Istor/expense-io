// Export CSV : règles pures (échappement RFC 4180 et neutralisation des formules, OWASP « CSV injection »).

const FORMULA_START = /^[=+\-@\t\r]/

/**
 * Une cellule sûre : une formule devient du texte (préfixe « ' »), et TOUT texte est entre guillemets. Sinon Excel en
 * français, dont le séparateur est « ; », coupe `x;=cmd` en deux cellules et évalue la seconde (relecture sécurité).
 */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const text = FORMULA_START.test(value) ? `'${value}` : value
  return `"${text.replaceAll('"', '""')}"`
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}
