// Ouvre une session Auth.js (provider credentials) et imprime le cookie, pour les outils qui testent l'API de
// l'extérieur (Schemathesis). Usage : node scripts/session-cookie.mjs <baseURL> <email> <motdepasse>
const [baseURL, email, password] = process.argv.slice(2)
const csrf = await fetch(`${baseURL}/api/auth/csrf`)
const jar = csrf.headers.getSetCookie().map((c) => c.split(';')[0])
const { csrfToken } = await csrf.json()
const login = await fetch(`${baseURL}/api/auth/callback/credentials`, {
  method: 'POST',
  redirect: 'manual',
  headers: { cookie: jar.join('; '), 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken, email, password }),
})
const session = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('authjs.session-token='))
if (!session) {
  console.error(`Connexion impossible pour ${email} (code ${login.status})`)
  process.exit(1)
}
console.log(session)
