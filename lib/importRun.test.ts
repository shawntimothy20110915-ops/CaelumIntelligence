import { describe, it, expect } from 'vitest'
import { parseClaudeJsonl, parseStepsJson, parseTranscript } from '@/lib/importRun'

const jsonl = [
  JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Add a healthcheck' }] } }),
  JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Adding /health + test.' }] } }),
  JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'app/health/route.ts' } }] } }),
  JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: 'npm test' }] } }),
  JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Done, tests green.' }] } }),
].join('\n')

describe('Claude Code JSONL parser', () => {
  it('maps roles and tools to step kinds', () => {
    const steps = parseClaudeJsonl(jsonl)
    expect(steps.map(s => s.kind)).toEqual(['thought', 'thought', 'edit', 'tool', 'result'])
    expect(steps[0].label).toBe('prompt')
    expect(steps[2].file).toBe('app/health/route.ts')
    expect(steps[steps.length - 1].kind).toBe('result')
    expect(steps.every((s, i) => s.i === i)).toBe(true)
  })

  it('skips unparseable lines', () => {
    expect(parseClaudeJsonl('garbage\n{bad json}\n')).toEqual([])
  })
})

describe('steps JSON parser', () => {
  it('normalizes a raw steps array', () => {
    const steps = parseStepsJson(JSON.stringify([{ kind: 'tool', label: 'read', detail: 'x' }, { kind: 'nope', content: 'y' }]))
    expect(steps).toHaveLength(2)
    expect(steps[0].kind).toBe('tool')
    expect(steps[1].kind).toBe('thought') // invalid kind falls back
  })

  it('returns [] for non-arrays', () => {
    expect(parseStepsJson('{}')).toEqual([])
  })
})

describe('parseTranscript auto', () => {
  it('prefers jsonl, falls back to steps', () => {
    expect(parseTranscript('auto', jsonl).length).toBe(5)
    expect(parseTranscript('auto', JSON.stringify([{ kind: 'result', label: 'done', detail: 'ok' }])).length).toBe(1)
  })
})
