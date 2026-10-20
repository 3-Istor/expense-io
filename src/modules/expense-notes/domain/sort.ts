// Tris autorisés pour la liste de ses notes (SEC-01, ADR 0003) : une liste fermée, jamais de SQL venu du client.

export const SORTABLE_COLUMNS = ['created_at', 'amount', 'expense_date', 'status', 'description'] as const
type SortColumn = (typeof SORTABLE_COLUMNS)[number]
export interface Sort {
  column: SortColumn
  direction: 'ASC' | 'DESC'
}

const DEFAULT_SORT: Sort = { column: 'created_at', direction: 'DESC' }

export function parseSort(value: string | null): Sort | null {
  if (!value) return DEFAULT_SORT
  const match = /^\s*([a-z_]+)(?:\s+(asc|desc))?\s*$/i.exec(value)
  if (!match) return null
  const column = match[1].toLowerCase()
  if (!(SORTABLE_COLUMNS as readonly string[]).includes(column)) return null
  return { column: column as SortColumn, direction: (match[2]?.toUpperCase() ?? 'ASC') as Sort['direction'] }
}
