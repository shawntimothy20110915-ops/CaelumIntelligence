import type { RunStep } from '@/lib/labsStore'

// Convert real agent transcripts into Replay steps.
// Tolerant by design: unparseable lines are skipped, shapes vary by tool/version.

type AnyObj = Record<string, unknown>

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit', 'create_file', 'apply_patch', 'str_replace_editor'])

function asText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(b => {
        const block = b as AnyObj
        if (typeof block.text === 'string') return block.text
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}

function fileFromInput(input: unknown): string | undefined {
  const o = (input ?? {}) as AnyObj
  const f = o.file_path ?? o.path ?? o.filename ?? o.notebook_path
  return typeof f === 'string' ? f : undefined
}

function clip(s: string, n = 2000): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// Claude Code / Anthropic-style JSONL: one JSON object per line.
export function parseClaudeJsonl(raw: string): RunStep[] {
  const steps: Omit<RunStep, 'i'>[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    let obj: AnyObj
    try { obj = JSON.parse(t) as AnyObj } catch { continue }

    // unwrap common envelopes
    const msg = (obj.message ?? obj) as AnyObj
    const role = (msg.role ?? obj.type) as string | undefined
    const content = msg.content ?? obj.content

    // tool calls / results carried as content blocks
    const blocks = Array.isArray(content) ? content : []
    let handledBlock = false
    for (const b of blocks) {
      const block = b as AnyObj
      if (block.type === 'tool_use') {
        handledBlock = true
        const name = String(block.name ?? 'tool')
        const file = fileFromInput(block.input)
        steps.push({
          kind: EDIT_TOOLS.has(name) ? 'edit' : 'tool',
          label: name,
          detail: clip(typeof block.input === 'string' ? block.input : JSON.stringify(block.input ?? {})),
          file,
        })
      }
    }
    if (handledBlock) continue

    const text = asText(content)
    if (!text) continue
    if (role === 'assistant') steps.push({ kind: 'thought', label: 'assistant', detail: clip(text) })
    else if (role === 'user' || role === 'human') steps.push({ kind: 'thought', label: 'prompt', detail: clip(text) })
  }
  if (steps.length > 0) steps[steps.length - 1] = { ...steps[steps.length - 1], kind: 'result', label: 'final' }
  return steps.slice(0, 200).map((s, i) => ({ ...s, i }))
}

// Generic: a raw array of step-like objects.
export function parseStepsJson(raw: string): RunStep[] {
  let arr: unknown
  try { arr = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(arr)) return []
  return arr.slice(0, 200).map((s, i) => {
    const o = (s ?? {}) as AnyObj
    const kind = ['thought', 'tool', 'edit', 'result'].includes(String(o.kind)) ? (o.kind as RunStep['kind']) : 'thought'
    return {
      i,
      kind,
      label: clip(String(o.label ?? kind), 80),
      detail: clip(String(o.detail ?? o.content ?? '')),
      file: o.file ? clip(String(o.file), 200) : undefined,
    }
  })
}

export function parseTranscript(format: string, raw: string): RunStep[] {
  if (format === 'claude-jsonl') return parseClaudeJsonl(raw)
  if (format === 'json-steps') return parseStepsJson(raw)
  // auto: try jsonl first, then steps
  const j = parseClaudeJsonl(raw)
  if (j.length) return j
  return parseStepsJson(raw)
}
