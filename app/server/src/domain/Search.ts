/** One web result, reduced to what we show and what the model is given. */
export interface SearchResult {
  readonly title: string
  readonly url: string
  /** The site, e.g. "example.com". */
  readonly host: string
  readonly description: string
  /** A few extra excerpts from the page, when the search service supplies them. */
  readonly snippets: readonly string[]
}
