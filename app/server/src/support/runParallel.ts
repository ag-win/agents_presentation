/**
 * Runs several generators at the same time and interleaves their events as they happen.
 * Resolves to each generator's return value, in the order the generators were given.
 */
export async function* runParallel<E, R>(runs: readonly AsyncGenerator<E, R>[]): AsyncGenerator<E, R[]> {
  const results = new Array<R>(runs.length)
  const pending = new Map<number, Promise<{ index: number; result: IteratorResult<E, R> }>>()
  const pull = (index: number) => pending.set(index, runs[index].next().then((result) => ({ index, result })))
  runs.forEach((_, index) => pull(index))
  try {
    while (pending.size > 0) {
      const { index, result } = await Promise.race(pending.values())
      if (result.done) {
        results[index] = result.value
        pending.delete(index)
      } else {
        pull(index)
        yield result.value
      }
    }
  } finally {
    // On an early exit (client left, one run failed) stop the others and swallow their late errors.
    for (const promise of pending.values()) promise.catch(() => undefined)
    await Promise.allSettled(runs.map((run) => run.return(undefined as never)))
  }
  return results
}
