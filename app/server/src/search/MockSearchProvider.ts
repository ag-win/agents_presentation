import type { SearchResult } from '../domain/Search.ts'
import type { SearchProvider } from './SearchProvider.ts'

/** Offline stand-in: invents a few plausible-looking results so the demo works with no key and no network. */
export class MockSearchProvider implements SearchProvider {
  readonly name = 'mock'
  readonly isLive = false

  async search(query: string): Promise<readonly SearchResult[]> {
    const topic = query.trim().slice(0, 60)
    return [
      { title: `${topic}: a quick guide`, url: 'https://guides.example.com/quick-guide', host: 'guides.example.com', description: `A short, practical overview of ${topic}, with the most common questions answered.`, snippets: ['Start with the basics, then look at the options that fit your situation.'] },
      { title: `Everything you need to know about ${topic}`, url: 'https://www.example.org/knowledge/' + encodeURIComponent(topic), host: 'example.org', description: `An in-depth article on ${topic}, updated regularly by the editors.`, snippets: [] },
      { title: `${topic} - questions and answers`, url: 'https://community.example.net/questions', host: 'community.example.net', description: `People ask and answer questions about ${topic}. Top answers are voted by the community.`, snippets: ['Most helpful answer: compare two or three sources before deciding.'] },
    ]
  }
}
