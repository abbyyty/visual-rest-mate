// Development-only logging utility to prevent information leakage in production

export function devError(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(message, ...args);
  }
}

export function devWarn(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(message, ...args);
  }
}

export function devLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
}
