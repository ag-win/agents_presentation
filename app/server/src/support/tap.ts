/** Passes a generator's events through unchanged while letting the caller peek at each one. Keeps the return value. */
export async function* tap<E, R>(run: AsyncGenerator<E, R>, peek: (event: E) => void): AsyncGenerator<E, R> {
  let step = await run.next()
  while (!step.done) {
    peek(step.value)
    yield step.value
    step = await run.next()
  }
  return step.value
}
