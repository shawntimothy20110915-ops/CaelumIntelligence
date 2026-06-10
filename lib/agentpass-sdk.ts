/**
 * AgentPass enforcement SDK.
 *
 * The point of AgentPass is that the policy check sits IN the agent's execution
 * path — not in a dashboard it can ignore. Wrap any tool/effect with `guard()`:
 * the action is authorized first, and the tool body only runs on `approved`.
 * `denied` and `human_review` throw, so an unauthorized action can never execute.
 *
 *   const guard = createGuard(httpEvaluator({ baseUrl, apiKey }))
 *   const receipt = await guard(
 *     { action: 'purchase', merchant: 'amazon.com', amount: 99 },
 *     () => stripe.charge(...),            // only runs if approved
 *   )
 */

export type Decision = 'approved' | 'denied' | 'human_review'

export interface GuardAction {
  action: string
  merchant?: string
  amount?: number
  metadata?: Record<string, unknown>
}

export interface EvalResult {
  decision: Decision
  reason: string
  receiptId?: string
}

export type Evaluator = (action: GuardAction) => Promise<EvalResult>

export class AgentPassDenied extends Error {
  readonly result: EvalResult
  constructor(result: EvalResult) {
    super(`AgentPass denied: ${result.reason}`)
    this.name = 'AgentPassDenied'
    this.result = result
  }
}

export class AgentPassReviewRequired extends Error {
  readonly result: EvalResult
  constructor(result: EvalResult) {
    super(`AgentPass requires human approval: ${result.reason}`)
    this.name = 'AgentPassReviewRequired'
    this.result = result
  }
}

/** Build a guard that authorizes an action before running the effect it protects. */
export function createGuard(evaluate: Evaluator) {
  return async function guard<T>(action: GuardAction, run: () => Promise<T>): Promise<T> {
    const result = await evaluate(action)
    if (result.decision === 'denied') throw new AgentPassDenied(result)
    if (result.decision === 'human_review') throw new AgentPassReviewRequired(result)
    return run()
  }
}

/** Default evaluator: calls the hosted AgentPass `/api/eval` with an API key. */
export function httpEvaluator(opts: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }): Evaluator {
  const f = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  return async (action) => {
    const res = await f(`${base}/api/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: opts.apiKey, ...action }),
    })
    const d = (await res.json()) as { decision?: Decision; reason?: string; receiptId?: string; error?: string }
    if (!res.ok) return { decision: 'denied', reason: d.error ?? `eval failed (${res.status})` }
    return { decision: d.decision ?? 'denied', reason: d.reason ?? '', receiptId: d.receiptId }
  }
}
