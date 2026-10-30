import type { Metadata } from 'next'
import type { ReactNode } from 'react'
// Polices servies depuis node_modules (paquet geist), pas téléchargées chez Google au build : build reproductible
// sans accès Internet (Docker, CI, moulinette).
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import Link from 'next/link'
import Script from 'next/script'
import './globals.css'
import { auth } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { NavItem } from '@/components/NavItem'
import { umamiConfig } from '@/lib/umami'

export const metadata: Metadata = {
  title: 'Expense.io',
  description: 'Gestion des notes de frais',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const umami = umamiConfig(process.env)

  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-sm text-white">
                €
              </span>
              Expense.io
            </Link>
            {session?.user && (
              <form action={logout} className="flex items-center gap-3">
                {session.user.role === 'manager' && (
                  <NavItem href="/manager" label="Manager" />
                )}
                {session.user.role === 'hr_admin' && (
                  <NavItem href="/hr" label="RH" />
                )}
                <span className="hidden text-sm text-gray-500 sm:inline dark:text-gray-400">
                  {session.user.email}
                </span>
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Se déconnecter
                </button>
              </form>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</div>
        {/* Usage des fonctionnalités (T-0028) : Umami, seulement si configuré. Sans cookie, sans donnée personnelle ;
            les boutons clés portent un data-umami-event (suggestion OCR, soumission, décision). */}
        {umami && (
          <Script
            src={umami.scriptUrl}
            data-website-id={umami.websiteId}
            data-do-not-track="true"
            data-exclude-search="true"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
