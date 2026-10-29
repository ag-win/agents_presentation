import type { SearchResult } from '../domain/Search.ts'
import type { SearchProvider } from './SearchProvider.ts'

function result(title: string, host: string, path: string, description: string): SearchResult {
  return { title, url: `https://${host}/${path}`, host, description, snippets: [] }
}

const TOPICS: { when: RegExp; results: (q: string) => SearchResult[] }[] = [
  {
    when: /egg|tomato|dinner|recipe|cook|meal|rice|soup|chicken/i,
    results: () => [
      result('Tomato and egg stir-fry in 15 minutes', 'recipes.example.com', 'tomato-egg-stir-fry', 'Soft scrambled eggs folded into sweet, jammy tomatoes. A quick weeknight dinner that needs only a pan, salt and a little sugar.'),
      result('Shakshuka: eggs poached in spicy tomato sauce', 'kitchen.example.org', 'shakshuka', 'Simmer tomatoes with onion and pepper, crack in the eggs, cover and cook until just set. Serve with bread.'),
      result('Ten dinners you can make with eggs', 'meals.example.net', 'egg-dinners', 'From omelettes to fried rice: easy, cheap dinners built around eggs, with tomato-based sauces for variety.'),
    ],
  },
  {
    when: /flight|fly|nairobi|travel|hotel|visa|trip|holiday|airport/i,
    results: (q) => [
      result('Cheap flights: how to find the best fares', 'flights.example.com', 'cheap-flights', `Compare dates and nearby airports. Fares for ${q.replace(/^cheap flights to /i, '')} are usually lowest on weekdays and booked six to eight weeks ahead.`),
      result('December travel: prices, weather and crowds', 'travelguide.example.org', 'december-travel', 'December is peak season in many places. Book early, be flexible with dates, and consider travelling just before the holidays.'),
      result('Visa and entry requirements at a glance', 'visas.example.net', 'entry-requirements', 'Check passport validity and whether an e-visa is needed before you buy a ticket. Most approvals take a few days.'),
    ],
  },
  {
    when: /headache|pain|sleep|health|doctor|fever|symptom|eye|screen|migraine/i,
    results: () => [
      result('Why screens can cause headaches', 'health.example.com', 'screen-headaches', 'Long periods of screen use can cause eye strain, poor posture and neck tension, all of which may trigger headaches.'),
      result('Digital eye strain: causes and what helps', 'eyecare.example.org', 'eye-strain', 'Follow the 20-20-20 rule, adjust brightness, keep the screen at arm\'s length and blink often to relieve strain.'),
      result('When a headache needs a doctor', 'clinic.example.net', 'headache-warning-signs', 'Sudden severe headaches, headaches with fever or vision changes, or ones that keep returning should be checked by a professional.'),
    ],
  },
  {
    when: /rainbow|why|how do|what is|science|light/i,
    results: () => [
      result('How rainbows form', 'science.example.com', 'how-rainbows-form', 'Sunlight enters water droplets, bends as it slows down, reflects off the back and bends again as it leaves, splitting into colours.'),
      result('Rainbows explained for kids', 'learn.example.org', 'rainbows', 'A rainbow appears when the sun is behind you and it is raining in front of you. Red is on the outside and violet on the inside.'),
      result('The physics of light and colour', 'physics.example.net', 'light-and-colour', 'White light is a mixture of colours. Refraction bends each colour by a slightly different amount, which is why a prism or a raindrop spreads them out.'),
    ],
  },
]

/**
 * Backup search for when the real one is unavailable: a few believable results per topic (food, travel, health,
 * general science) so the demo still tells a sensible story, and a generic set for anything else.
 */
export class MockSearchProvider implements SearchProvider {
  readonly name = 'backup'
  readonly isLive = false

  async search(query: string): Promise<readonly SearchResult[]> {
    const topic = TOPICS.find((t) => t.when.test(query))
    if (topic) return topic.results(query)
    const subject = query.trim().slice(0, 60)
    return [
      result(`${subject}: a quick guide`, 'guides.example.com', 'quick-guide', `A short, practical overview of ${subject}, with the most common questions answered.`),
      result(`Everything you need to know about ${subject}`, 'knowledge.example.org', 'overview', `An in-depth article on ${subject}, updated regularly by the editors.`),
      result(`${subject}: questions and answers`, 'community.example.net', 'questions', `People ask and answer questions about ${subject}. Top answers are voted by the community.`),
    ]
  }
}
