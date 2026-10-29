/** Reads a fetch body as newline-delimited JSON and yields each parsed line as it arrives. */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let tail = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    tail += decoder.decode(value, { stream: true })
    const lines = tail.split('\n')
    tail = lines.pop() ?? ''
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as T
  }
  if (tail.trim()) yield JSON.parse(tail) as T
}
