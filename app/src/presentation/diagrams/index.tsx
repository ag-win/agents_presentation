import { Diagram, Edge, Group, Label, Node, curve, curveV, line } from './kit'

/**
 * Workflow diagrams, drawn in SVG. Coordinates are centre-based within each viewBox.
 * Edge styles carry meaning: solid = the main path, dotted = a branch the model may or may
 * not take, dashed = an exit / stop path.
 */

export function AugmentedLLM() {
  return (
    <Diagram w={920} h={470} label="Augmented LLM: input to LLM to output, with retrieval, tools and memory attached">
      <Node x={153} y={100} w={130} h={64} kind="io" lines="In" size={28} />
      <Node x={450} y={100} w={160} h={76} kind="llm" lines="LLM" size={30} />
      <Node x={764} y={100} w={130} h={64} kind="io" lines="Out" size={28} />
      <Edge d={line(222, 100, 366, 100)} />
      <Edge d={line(534, 100, 692, 100)} />

      {/* the three augmentations: dashed, two-way */}
      <Edge d={line(412, 146, 314, 322)} style="dashed" tone="soft" both />
      <Edge d={line(450, 146, 450, 344)} style="dashed" tone="soft" both />
      <Edge d={line(488, 146, 586, 322)} style="dashed" tone="soft" both />
      <Label x={268} y={236} lines={['Query/', 'Results']} size={22} />
      <Label x={450} y={240} lines={['Call/', 'Response']} size={22} />
      <Label x={632} y={236} lines={['Read/', 'Write']} size={22} />

      <Node x={249} y={372} w={172} h={66} kind="logic" lines="Retrieval" size={26} />
      <Node x={450} y={392} w={150} h={66} kind="logic" lines="Tools" size={26} />
      <Node x={650} y={372} w={172} h={66} kind="logic" lines="Memory" size={26} />
    </Diagram>
  )
}

export function PromptChain() {
  return (
    <Diagram w={1120} h={300} label="Prompt chaining: three LLM calls in sequence with a gate after the first">
      <Node x={62} y={150} w={100} h={58} kind="io" lines="In" />
      <Node x={250} y={150} w={140} h={58} kind="llm" lines="LLM Call 1" />
      <Node x={480} y={150} w={96} h={58} kind="logic" lines="Gate" />
      <Node x={690} y={64} w={140} h={58} kind="llm" lines="LLM Call 2" />
      <Node x={890} y={64} w={140} h={58} kind="llm" lines="LLM Call 3" />
      <Node x={1060} y={64} w={80} h={58} kind="io" lines="Out" />
      <Node x={690} y={256} w={96} h={58} kind="io" lines="Exit" />

      <Edge d={line(112, 150, 180, 150)} />
      <Edge d={line(320, 150, 432, 150)} />
      <Label x={376} y={204} lines="Output 1" />
      <Edge d={curve(528, 136, 620, 64)} />
      <Label x={552} y={84} lines="Pass" />
      <Edge d={line(508, 179, 640, 240)} style="dashed" />
      <Label x={548} y={228} lines="Fail" />
      <Edge d={line(760, 64, 820, 64)} />
      <Label x={790} y={116} lines="Output 2" />
      <Edge d={line(960, 64, 1020, 64)} />
    </Diagram>
  )
}

export function Routing() {
  return (
    <Diagram w={1000} h={420} label="Routing: a router LLM sends the input down one of three specialised paths">
      <Node x={70} y={210} w={104} h={60} kind="io" lines="In" />
      <Node x={260} y={210} w={160} h={90} kind="llm" lines={['LLM Call', 'Router']} />
      <Node x={600} y={50} w={160} h={58} kind="llm" lines="LLM Call 1" />
      <Node x={610} y={210} w={160} h={58} kind="llm" lines="LLM Call 2" strong />
      <Node x={600} y={370} w={160} h={58} kind="llm" lines="LLM Call 3" />
      <Node x={930} y={210} w={104} h={60} kind="io" lines="Out" />

      <Edge d={line(122, 210, 178, 210)} />
      <Edge d={curve(340, 180, 518, 50)} />
      <Edge d={line(340, 210, 526, 210)} style="dotted" />
      <Edge d={curve(340, 240, 518, 370)} style="dotted" />
      <Edge d={curve(680, 50, 876, 190)} />
      <Edge d={line(690, 210, 876, 210)} style="dotted" />
      <Edge d={curve(680, 370, 876, 230)} style="dotted" />
    </Diagram>
  )
}

export function Parallelization() {
  return (
    <Diagram w={1000} h={400} label="Parallelization: three LLM calls run at once and an aggregator combines them">
      <Node x={64} y={200} w={104} h={60} kind="io" lines="In" />
      <Node x={290} y={50} w={160} h={58} kind="llm" lines="LLM Call 1" />
      <Node x={290} y={200} w={160} h={58} kind="llm" lines="LLM Call 2" />
      <Node x={290} y={350} w={160} h={58} kind="llm" lines="LLM Call 3" />
      <Node x={650} y={200} w={180} h={66} kind="logic" lines="Aggregator" />
      <Node x={920} y={200} w={104} h={60} kind="io" lines="Out" />

      <Edge d={curve(116, 184, 210, 50)} />
      <Edge d={line(116, 200, 210, 200)} />
      <Edge d={curve(116, 216, 210, 350)} />
      <Edge d={curve(370, 50, 558, 184)} />
      <Edge d={line(370, 200, 558, 200)} />
      <Edge d={curve(370, 350, 558, 216)} />
      <Edge d={line(740, 200, 866, 200)} />
    </Diagram>
  )
}

export function OrchestratorWorkers() {
  return (
    <Diagram w={1120} h={400} label="Orchestrator-workers: an orchestrator delegates subtasks to worker LLMs and a synthesizer combines the results">
      <Node x={62} y={200} w={96} h={60} kind="io" lines="In" />
      <Node x={250} y={200} w={170} h={70} kind="llm" lines="Orchestrator" />
      <Node x={520} y={50} w={150} h={58} kind="llm" lines="LLM Call 1" />
      <Node x={520} y={200} w={150} h={58} kind="llm" lines="LLM Call 2" />
      <Node x={520} y={350} w={150} h={58} kind="llm" lines="LLM Call 3" />
      <Node x={820} y={200} w={170} h={70} kind="logic" lines="Synthesizer" />
      <Node x={1040} y={200} w={96} h={60} kind="io" lines="Out" />

      <Edge d={line(110, 200, 163, 200)} />
      <Edge d={curve(335, 180, 443, 50)} style="dotted" />
      <Edge d={line(335, 200, 443, 200)} style="dotted" />
      <Edge d={curve(335, 220, 443, 350)} style="dotted" />
      <Edge d={curve(595, 50, 733, 182)} style="dotted" />
      <Edge d={line(595, 200, 733, 200)} style="dotted" />
      <Edge d={curve(595, 350, 733, 218)} style="dotted" />
      <Edge d={line(905, 200, 990, 200)} />
    </Diagram>
  )
}

/** The generator / evaluator loop on its own. Reused inside the combined diagrams via the same geometry idea. */
export function EvaluatorOptimizer() {
  return (
    <Diagram w={1000} h={340} label="Evaluator-optimizer: a generator proposes, an evaluator accepts or sends back feedback">
      <Node x={64} y={150} w={104} h={60} kind="io" lines="In" />
      <Node x={270} y={150} w={160} h={78} kind="llm" lines={['LLM Call', 'Generator']} />
      <Node x={700} y={150} w={160} h={78} kind="llm" lines={['LLM Call', 'Evaluator']} />
      <Node x={940} y={150} w={104} h={60} kind="io" lines="Out" />

      <Edge d={line(116, 150, 190, 150)} />
      <Edge d="M 335 111 C 400 20, 575 20, 640 111" />
      <Label x={487} y={26} lines="Solution" size={20} />
      <Edge d="M 640 189 C 575 280, 400 280, 335 189" />
      <Label x={487} y={296} lines={['Rejected +', 'Feedback']} size={20} />
      <Edge d={line(780, 150, 888, 150)} />
      <Label x={834} y={178} lines="Accepted" size={20} />
    </Diagram>
  )
}

export function AgentLoop() {
  return (
    <Diagram w={1000} h={390} label="Agent loop: the LLM acts on an environment and gets feedback, optionally checking in with a human, until it stops">
      <Node x={100} y={150} w={160} h={66} kind="io" lines="Human" />
      <Node x={430} y={150} w={170} h={78} kind="llm" lines="LLM Call" />
      <Node x={870} y={150} w={200} h={66} kind="io" lines="Environment" />
      <Node x={430} y={330} w={140} h={58} kind="logic" lines="Stop" />

      <Edge d={line(182, 150, 344, 150)} style="dotted" both />
      <Edge d="M 515 111 C 600 20, 740 20, 810 117" />
      <Label x={660} y={30} lines="Action" size={22} />
      <Edge d="M 820 183 C 740 285, 600 285, 515 189" />
      <Label x={668} y={296} lines="Feedback" size={22} />
      <Edge d={line(430, 190, 430, 298)} style="dashed" />
    </Diagram>
  )
}

export function ObserveReasonAct() {
  return (
    <Diagram w={1100} h={240} label="Observe, reason, act loop: screenshot, then reason, then click or type, then back to a new screenshot">
      <Node x={190} y={60} w={220} h={96} kind="neutral" lines={['Screenshot', '(observe)']} size={28} />
      <Node x={550} y={60} w={220} h={96} kind="hot" lines={['Reason', '(think)']} size={28} />
      <Node x={910} y={60} w={220} h={96} kind="neutral" lines={['Click / Type', '(act)']} size={28} />

      <Edge d={line(300, 60, 438, 60)} />
      <Edge d={line(660, 60, 798, 60)} />
      <Edge
        tone="accent"
        d="M 1020 60 H 1056 A 24 24 0 0 1 1080 84 V 176 A 24 24 0 0 1 1056 200 H 44 A 24 24 0 0 1 20 176 V 84 A 24 24 0 0 1 44 60 H 78"
      />
    </Diagram>
  )
}

/** Customer-support agent, technical-ticket path: Routing -> Orchestrator-Workers -> Evaluator-Optimizer. */
export function SupportNested() {
  return (
    <Diagram w={1840} h={960} label="Customer-support agent, technical ticket path: routing, then orchestrator-workers, then evaluator-optimizer">
      <text x={40} y={44} fontSize={30} fontWeight={700} fill="var(--ink)">Example: Customer-support agent (Technical ticket path)</text>

      <Group x={150} y={120} w={520} h={560} title="1. Routing" tone="purple" />
      <Group x={700} y={150} w={690} h={470} title="2. Orchestrator–Workers" tone="teal" />
      <Group x={1010} y={664} w={720} h={266} title="3. Evaluator–Optimizer" tone="orange" titleY={650} />

      <Node x={70} y={400} w={100} h={60} kind="io" lines="In" />
      <Node x={275} y={400} w={170} h={90} kind="llm" lines={['LLM Call', 'Router']} />
      <Node x={560} y={200} w={170} h={56} kind="llm" lines="Billing LLM" size={22} />
      <Node x={560} y={600} w={170} h={56} kind="llm" lines="General LLM" size={22} />
      <Edge d={line(120, 400, 190, 400)} />
      <Edge d={curve(360, 365, 475, 200)} style="dotted" />
      <Label x={414} y={282} lines="Billing" />
      <Edge d={curve(360, 435, 475, 600)} style="dotted" />
      <Label x={414} y={528} lines="General" />

      <Node x={810} y={400} w={180} h={62} kind="llm" lines="Orchestrator" size={22} />
      <Edge d={line(360, 400, 720, 400)} />
      <Label x={550} y={382} lines="Technical" />
      <Node x={1090} y={240} w={150} h={56} kind="llm" lines={['Diagnose', 'Issue']} size={17} />
      <Node x={1090} y={400} w={150} h={56} kind="llm" lines={['Search', 'Docs']} size={17} />
      <Node x={1090} y={560} w={150} h={56} kind="llm" lines={['Check', 'Logs']} size={17} />
      <Node x={1300} y={400} w={150} h={62} kind="llm" lines="Synthesizer" size={22} />
      <Edge d={curve(900, 382, 1015, 240)} style="dotted" />
      <Edge d={line(900, 400, 1015, 400)} style="dotted" />
      <Edge d={curve(900, 418, 1015, 560)} style="dotted" />
      <Edge d={curve(1165, 240, 1235, 384)} style="dotted" />
      <Edge d={line(1165, 400, 1225, 400)} style="dotted" />
      <Edge d={curve(1165, 560, 1235, 416)} style="dotted" />

      <Node x={1150} y={790} w={170} h={74} kind="llm" lines={['LLM Call', 'Generator']} size={22} />
      <Node x={1560} y={790} w={170} h={74} kind="llm" lines={['LLM Call', 'Evaluator']} size={22} />
      <Node x={1790} y={790} w={90} h={60} kind="io" lines="Out" />
      <Edge d={curveV(1300, 431, 1150, 752)} />
      <Label x={1336} y={556} lines="Draft" />
      <Edge d="M 1225 753 C 1285 690, 1425 690, 1485 753" />
      <Label x={1355} y={702} lines="Solution" />
      <Edge d="M 1485 827 C 1425 890, 1285 890, 1225 827" />
      <Label x={1355} y={902} lines={['Rejected +', 'Feedback']} />
      <Edge d={line(1645, 790, 1742, 790)} />
      <Label x={1690} y={820} lines="Accepted" size={17} />
    </Diagram>
  )
}

/** Router agent whose refund path runs an evaluator-optimizer loop. */
export function ThreePatterns() {
  return (
    <Diagram w={1840} h={830} label="Router agent with an evaluator-optimizer loop on the refund path">
      <Group x={30} y={70} w={1780} h={740} title="Router Agent" tone="purple" titleY={46} titleSize={32} solid />
      <Group x={960} y={270} w={720} h={330} title="Evaluator–Optimizer" tone="orange" titleY={254} titleSize={28} />

      <Node x={130} y={420} w={110} h={66} kind="io" lines="In" />
      <Node x={400} y={420} w={200} h={100} kind="llm" lines={['LLM Call', 'Router']} size={28} />
      <Node x={870} y={205} w={230} h={64} kind="llm" lines="Technical LLM" size={26} />
      <Node x={870} y={650} w={230} h={64} kind="llm" lines="General LLM" size={26} />
      <Node x={1090} y={420} w={190} h={84} kind="llm" lines={['LLM Call', 'Generator']} size={26} />
      <Node x={1480} y={420} w={190} h={84} kind="llm" lines={['LLM Call', 'Evaluator']} size={26} />
      <Node x={1730} y={420} w={100} h={66} kind="io" lines="Out" />

      <Edge d={line(185, 420, 300, 420)} />
      <Edge d={curve(500, 380, 755, 205)} style="dotted" />
      <Label x={622} y={286} lines="Technical" size={20} />
      <Edge d={line(500, 420, 995, 420)} />
      <Label x={750} y={400} lines="Refund" size={20} />
      <Edge d={curve(500, 460, 755, 650)} style="dotted" />
      <Label x={622} y={562} lines="General" size={20} />

      <Edge d="M 1160 378 C 1230 305, 1340 305, 1410 378" />
      <Label x={1285} y={318} lines="Solution" size={20} />
      <Edge d="M 1410 462 C 1340 535, 1230 535, 1160 462" />
      <Label x={1285} y={560} lines={['Rejected +', 'Feedback']} size={20} />
      <Edge d={line(1575, 420, 1676, 420)} />
      <Label x={1628} y={450} lines="Accepted" size={18} />
    </Diagram>
  )
}

/** The system prompt joins the user's prompt before it reaches the LLM. */
export function SystemPromptFlow() {
  return (
    <Diagram w={1000} h={360} label="The user's prompt and a hidden system prompt are combined before they reach the LLM">
      <Node x={430} y={72} w={270} h={84} kind="logic" lines={['System prompt', 'set by the app']} size={26} />
      <Node x={110} y={262} w={190} h={78} kind="io" lines={['User prompt', 'typed by you']} size={24} />
      <circle cx={430} cy={262} r={30} fill="var(--card)" stroke="var(--dg-edge)" strokeWidth={3} />
      <text x={430} y={273} textAnchor="middle" fontSize={34} fontWeight={700} fill="var(--ink)">+</text>
      <Node x={690} y={262} w={160} h={90} kind="llm" lines="LLM" size={30} />
      <Node x={905} y={262} w={150} h={78} kind="io" lines="Answer" size={26} />

      <Edge d={line(430, 114, 430, 230)} />
      <Label x={600} y={170} lines="added before the LLM sees it" size={22} />
      <Edge d={line(205, 262, 396, 262)} />
      <Edge d={line(464, 262, 608, 262)} />
      <Edge d={line(772, 262, 828, 262)} />
    </Diagram>
  )
}
