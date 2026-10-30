import { supportBench, supportSession } from '../sharedSession'
import type { BenchSnapshot } from '../SupportBench'
import type { Scenario } from '../types'

/** The test bench: every scenario goes through the guard and router only, and the route chosen is compared with the one we expect. */
export function BenchPanel({ scenarios, bench, disabled }: { scenarios: readonly Scenario[]; bench: BenchSnapshot; disabled: boolean }) {
  const rows = Object.values(bench.rows)
  const passed = rows.filter((r) => r.ok).length
  const failed = rows.filter((r) => r.ok === false).length
  return (
    <div className="sbench">
      <div className="sbench__bar">
        {bench.running ? (
          <button type="button" className="demo-btn" onClick={() => supportBench.stop()}>Stop</button>
        ) : (
          <button type="button" className="demo-btn is-on" disabled={disabled} onClick={() => void supportBench.run(scenarios)}>Run router test</button>
        )}
        <span className="sbench__sum">
          {bench.total === 0 ? `${scenarios.length} messages · guard + router only` : `${passed} as expected${failed ? ` · ${failed} different` : ''} · ${bench.finished}/${bench.total}`}
        </span>
      </div>
      <div className="sbench__head"><span /><span>Customer message</span><span>Expected</span><span>Router chose</span></div>
      <div className="sbench__list">
        {scenarios.map((s) => {
          const row = bench.rows[s.id]
          const state = row ? (row.error ? 'err' : row.ok ? 'ok' : 'bad') : 'wait'
          return (
            <button key={s.id} type="button" className={`sbench__row is-${state}`} disabled={disabled} onClick={() => supportSession.send(s.message)} title="Run this message through the whole desk">
              <span className="sbench__mark">{state === 'ok' ? '✓' : state === 'bad' ? '✗' : state === 'err' ? '!' : '·'}</span>
              <span className="sbench__title">{s.title}</span>
              <span className="sbench__route">{s.expect}</span>
              <span className="sbench__route sbench__got">{row ? (row.got ?? 'error') : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
