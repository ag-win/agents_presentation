import type { SearchResult } from '../domain/Search.ts'

const MAX_DESCRIPTION = 300
const MAX_SNIPPET = 220
const MAX_SNIPPETS = 2
const MAX_TOTAL = 2600

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/**
 * Turns search results into the block of text appended to the specialist's system prompt:
 * a short instruction followed by each result's site, title, description and a few excerpts.
 */
export class SearchContextFormatter {
  format(query: string, results: readonly SearchResult[]): string {
    if (results.length === 0) return ''
    const lines = [`Web search results for "${query}". Use them to answer and mention the websites you relied on. If they do not help, say so briefly.`]
    results.forEach((r, i) => {
      lines.push('', `[${i + 1}] ${r.title} (${r.host})`, clip(r.description, MAX_DESCRIPTION))
      r.snippets.slice(0, MAX_SNIPPETS).forEach((s) => lines.push(`- ${clip(s, MAX_SNIPPET)}`))
    })
    return clip(lines.join('\n'), MAX_TOTAL)
  }
}
