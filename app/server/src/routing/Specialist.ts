/** One assistant the router can send a query to. */
export class Specialist {
  readonly id: string
  readonly name: string
  /** One line telling the router what belongs here. */
  readonly scope: string
  readonly systemPrompt: string

  constructor(id: string, name: string, scope: string, systemPrompt: string) {
    this.id = id
    this.name = name
    this.scope = scope
    this.systemPrompt = systemPrompt
  }
}
