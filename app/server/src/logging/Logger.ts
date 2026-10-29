export interface Logger {
  info(message: string): void
  warn(message: string): void
  error(message: string, cause?: unknown): void
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`${this.stamp()} INFO  ${message}`)
  }

  warn(message: string): void {
    console.warn(`${this.stamp()} WARN  ${message}`)
  }

  error(message: string, cause?: unknown): void {
    console.error(`${this.stamp()} ERROR ${message}`, cause ?? '')
  }

  private stamp(): string {
    return new Date().toISOString().slice(11, 19)
  }
}

/** Swallows everything. Used in tests. */
export class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
}
