import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '@/modules/expense-notes/domain/csv'

describe('export CSV (injection de formules, OWASP)', () => {
  it('neutralise une cellule qui commence par = + - @ ou une tabulation', () => {
    for (const formula of ['=1+1', '+33', '-2', '@SUM(A1)', '\tx']) expect(csvCell(formula)).toBe(`"'${formula}"`)
  })
  it('échappe guillemets, virgules et retours à la ligne ; laisse les nombres tels quels', () => {
    expect(csvCell('Taxi, aéroport')).toBe('"Taxi, aéroport"')
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""')
    expect(csvCell(-12.5)).toBe('-12.5')
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\n1,x\n')
  })
})
