import { exec, tail } from '../lib/exec'
import type { Check } from '../types'

export const s1TypesLint: Check = {
  id: 'S1',
  title: 'Types et lint',
  risk: 'Bugs triviaux : types incohérents, code mort évident, erreurs de syntaxe',
  levels: ['fast', 'pr', 'nightly'],
  blocking: true,
  async run() {
    const tsc = exec('npx', ['tsc', '--noEmit'])
    const eslint = exec('npx', ['eslint', '.'])
    const failures: string[] = []
    if (tsc.code !== 0) failures.push(`tsc : ${tail(tsc.stdout, 3)}`)
    if (eslint.code !== 0) failures.push(`eslint : ${tail(eslint.stdout, 3)}`)
    return failures.length === 0
      ? { status: 'pass', summary: 'tsc et ESLint sans erreur' }
      : { status: 'fail', summary: failures.join(' | ') }
  },
}
