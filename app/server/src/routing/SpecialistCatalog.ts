import { Specialist } from './Specialist.ts'

const STYLE = 'Answer in at most four short sentences of plain text, name specific options, and give one practical tip.'

/** The specialists, in display order, with a general one that catches everything else. */
export class SpecialistCatalog {
  readonly specialists: readonly Specialist[]
  readonly fallback: Specialist

  constructor(specialists: readonly Specialist[], fallbackId: string) {
    const fallback = specialists.find((s) => s.id === fallbackId)
    if (!fallback) throw new Error(`fallback specialist "${fallbackId}" is not in the catalog`)
    this.specialists = specialists
    this.fallback = fallback
  }

  static standard(): SpecialistCatalog {
    return new SpecialistCatalog(
      [
        new Specialist('food', 'Food', 'recipes, cooking, ingredients, restaurants and meals', `You are a food expert for a search engine. You know cooking, recipes, ingredients, restaurants and meal planning. ${STYLE}`),
        new Specialist('travel', 'Travel', 'places to visit, trips, flights, hotels, visas and transport', `You are a travel expert for a search engine. You know places, routes, budgets, visas and the best time to go. ${STYLE}`),
        new Specialist('health', 'Health', 'symptoms, medicine, fitness, sleep and wellbeing', 'You are a careful health information assistant for a search engine. Give general information only, never a diagnosis, and say when to see a doctor. Answer in at most four short sentences of plain text.'),
        new Specialist('general', 'General', 'anything else', 'You are a helpful search assistant. Answer in at most four short sentences of plain text.'),
      ],
      'general',
    )
  }

  get ids(): string[] {
    return this.specialists.map((s) => s.id)
  }

  byId(id: string): Specialist {
    return this.specialists.find((s) => s.id === id) ?? this.fallback
  }

  /** The router's default system prompt, built from the specialists so the two can never disagree. */
  routerPrompt(): string {
    const names = this.ids
    const list = `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
    const scopes = this.specialists.map((s) => `${s.id}: ${s.scope}.`).join(' ')
    return `You route search queries to the best assistant. Reply with exactly one word: ${list}. ${scopes} Reply with the word only.`
  }
}
