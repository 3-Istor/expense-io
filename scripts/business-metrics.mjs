// Métriques métier lues en base (cours 4 : « jauges lues en base ») : ce que les journaux d'API ne montrent pas.
// - notes en attente par entreprise, et l'ancienneté de la plus vieille (une note sans valideur ne bouge jamais) ;
// - SLI métier de docs/slo.md : part des notes décidées en moins de 5 jours, parmi les notes soumises.
// Lecture seule, avec le compte administrateur (la RLS limiterait le compte de l'app à une seule entreprise).
// Usage : npm run metrics:business [-- --json]
import { config as loadEnv } from 'dotenv'
import pg from 'pg'

loadEnv({ quiet: true })
const DAY = 86_400
const DECISION_SLO_DAYS = 5
const WINDOW_DAYS = 28

const pool = new pg.Pool({ connectionString: process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL })
try {
  const pending = await pool.query(`
    SELECT c.name AS company, count(*)::int AS pending,
           extract(epoch FROM now() - min(en.created_at))::int AS oldest_pending_seconds
    FROM expense_notes en JOIN users u ON u.id = en.user_id JOIN companies c ON c.id = u.company_id
    WHERE en.status = 'pending'
    GROUP BY c.name ORDER BY oldest_pending_seconds DESC`)
  // Dénominateur = notes SOUMISES assez anciennes pour avoir pu être décidées dans le délai (pas les seules notes
  // décidées) : une note perdue fait baisser le SLI au lieu de disparaître du calcul.
  const sli = await pool.query(
    `SELECT count(*)::int AS submitted,
            count(*) FILTER (WHERE decided_at IS NOT NULL AND decided_at - created_at <= make_interval(days => $1))::int AS on_time
     FROM expense_notes
     WHERE created_at >= now() - make_interval(days => $2) AND created_at <= now() - make_interval(days => $1)`,
    [DECISION_SLO_DAYS, WINDOW_DAYS],
  )
  const { submitted, on_time: onTime } = sli.rows[0]
  const report = {
    pendingByCompany: pending.rows,
    decisionSli: { windowDays: WINDOW_DAYS, sloDays: DECISION_SLO_DAYS, submitted, onTime, ratio: submitted ? onTime / submitted : null },
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report))
  } else {
    console.log('Notes en attente par entreprise (plus vieille en premier)')
    for (const row of report.pendingByCompany) {
      console.log(`  ${row.company} : ${row.pending} en attente, la plus vieille depuis ${(row.oldest_pending_seconds / DAY).toFixed(1)} j`)
    }
    if (!report.pendingByCompany.length) console.log('  aucune')
    const ratio = report.decisionSli.ratio === null ? 'pas encore de données' : `${(report.decisionSli.ratio * 100).toFixed(1)} %`
    console.log(`SLI métier (${WINDOW_DAYS} j) : notes décidées en ${DECISION_SLO_DAYS} j ou moins / soumises = ${onTime}/${submitted} → ${ratio}`)
  }
} finally {
  await pool.end()
}
