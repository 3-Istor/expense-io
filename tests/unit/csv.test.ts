import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '@/modules/expense-notes/domain/csv'

describe('export CSV (injection de formules, OWASP)', () => {
  it('neutralise une cellule qui commence par = + - @ ou une tabulation', () => {
    for (const formula of ['=1+1', '+33', '-2', '@SUM(A1)', '\tx', '\r=1+1']) expect(csvCell(formula)).toBe(`"'${formula}"`)
  })
  it('met tout texte entre guillemets : un « ; » (séparateur d\'Excel en français) ne coupe jamais la cellule', () => {
    expect(csvCell('x;=cmd|calc')).toBe('"x;=cmd|calc"')
    expect(csvCell('Taxi, aéroport')).toBe('"Taxi, aéroport"')
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""')
    expect(csvCell(-12.5)).toBe('-12.5')
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('"a","b"\n1,"x"\n')
  })
})
