import { ContentSlide } from '../layouts'
import { Flow } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's05', title: '2018 — Pretrain, then adapt' }

export default function S05() {
  return (
    <ContentSlide
      title="2018 — Pretrain, then adapt"
      cite="Radford et al., OpenAI, 2018 — Improving Language Understanding by Generative Pre-Training"
    >
      <Flow steps={[
        { title: 'Unlabeled text', sub: '(massive corpus)' },
        { title: 'Pretrain LM', sub: '(predict next token)' },
        { title: 'Fine-tune', sub: '(task-specific labels)' },
        { title: 'Downstream task', sub: 'performance' },
      ]} />
      <div className="row" style={{ marginTop: 44, gap: 40 }}>
        <div className="card card--accent">
          <h3>GPT-1</h3>
          <p><b className="accent">117M</b> parameters</p>
          <p className="muted">Radford et al., OpenAI, 2018</p>
        </div>
        <ul className="bullets" style={{ flex: 2 }}>
          <li>One pretraining step → adaptable to many downstream tasks.</li>
          <li className="muted">vs. prior approach: train a bespoke model per task.</li>
          <li>First large demonstration that unsupervised pretraining + supervised fine-tuning = general-purpose language capability.</li>
        </ul>
      </div>
    </ContentSlide>
  )
}
