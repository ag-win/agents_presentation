/** The slice of `fetch` our network classes need. Injected so tests can run without a network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>
