/** Rejette si `promise` ne se termine pas avant `ms` millisecondes ; `onTimeout` libère la ressource. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error(`Délai dépassé (${ms} ms)`))
    }, ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** Limite le nombre de tâches simultanées ; les suivantes attendent leur tour. */
export function createLimiter(max: number) {
  let running = 0
  const waiting: (() => void)[] = []
  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve))
    running++
    try {
      return await task()
    } finally {
      running--
      waiting.shift()?.()
    }
  }
}
