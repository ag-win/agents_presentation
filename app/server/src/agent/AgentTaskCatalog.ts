export interface AgentTask {
  readonly id: string
  readonly title: string
  readonly message: string
  /** What the audience should see, for the speaker notes. */
  readonly watch: string
}

const TASKS: readonly AgentTask[] = [
  { id: 'no-tools', title: 'No tools needed', message: 'What is the capital of Kenya?', watch: 'One LLM call and straight to the output: the agent decides not to use any tool.' },
  { id: 'files-roundtrip', title: 'Write a file, read it back', message: 'Write a file called hello.txt that says "Hello from the agent", then read it back to check it was saved.', watch: 'Two steps in a row: write_file, then read_file. The second call only exists because the first result came back.' },
  { id: 'math', title: 'Prices and a sum', message: 'What is the total for 3 Lenovo IdeaPad laptops and 5 Casio G-Shock DW-5600E watches with 15% off everything? Look up the prices.', watch: 'Two find_product calls at the same time, then the calculator. Nobody told it to look up in parallel.' },
  { id: 'research-file', title: 'Research into a file', message: 'Search the web for what a prompt injection attack is, then write a three-bullet summary to a file called injection.txt.', watch: 'web_search, then write_file. Needs a Brave key for real results (Backup search otherwise).' },
  { id: 'research-parallel', title: 'Two searches, one checklist', message: 'Search the web for tips on looking after a laptop battery and for tips on looking after running shoes, then write one combined checklist to care.txt.', watch: 'Two web_search calls at once (Brave serves them about a second apart), then write_file.' },
  { id: 'subagents', title: 'One sub-agent per product', message: 'Use a sub-agent for each product to prepare a one-paragraph customer brief on the Sony WI-XB400 earphones and on the Tecno Spark 20, then combine both briefs into a short comparison.', watch: 'Two spawn_agent calls at once. Each sub-agent runs its own mini-loop (find_product, get_reviews) in its own lane; the main agent then combines their answers.' },
]

/** Starter tasks that are not ShopEase messages (those come from the support scenarios). */
export class AgentTaskCatalog {
  readonly tasks: readonly AgentTask[] = TASKS
}
