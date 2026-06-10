# AgentPass Enforcement SDK

The whole point of AgentPass is that the authorization check sits **in the agent's
execution path** — not in a dashboard the agent can ignore. The SDK
(`lib/agentpass-sdk.ts`) wraps any tool/effect so it only runs when the action is
approved. `denied` and `human_review` throw, so an unauthorized action can never
execute.

## Usage

```ts
import { createGuard, httpEvaluator, AgentPassDenied, AgentPassReviewRequired }
  from 'agentpass'

const guard = createGuard(httpEvaluator({
  baseUrl: 'https://api.agentpass.dev',
  apiKey: process.env.AGENTPASS_API_KEY!,   // the passport's ap_live_… key
}))

try {
  const result = await guard(
    { action: 'purchase', merchant: 'amazon.com', amount: 99 },
    () => stripe.charges.create({ amount: 9900, ... }),   // runs ONLY if approved
  )
} catch (e) {
  if (e instanceof AgentPassReviewRequired) {
    // route to the human approval queue; the charge did not happen
  } else if (e instanceof AgentPassDenied) {
    // policy violation; the charge did not happen
  } else throw e
}
```

`guard(action, run)` calls `/api/eval` with the API key, then:

| decision        | behavior                                            |
| --------------- | --------------------------------------------------- |
| `approved`      | runs `run()` and returns its result                 |
| `human_review`  | throws `AgentPassReviewRequired` (tool never runs)  |
| `denied`        | throws `AgentPassDenied` (tool never runs)          |

The decision is the single shared policy in `lib/policy.ts`, identical to
`/api/approval/evaluate` — proof status, granted permissions, per-proof amount cap,
merchant allowlist, the $1000 human-review threshold, and the spend budget.

## Custom evaluators / MCP

`createGuard` takes any `Evaluator` (`(action) => Promise<EvalResult>`), so the same
enforcement wrapper drops into an MCP server: expose an `agentpass_guard` tool whose
handler calls `guard()` before delegating to the real tool. `httpEvaluator` is just
the default that talks to the hosted API.

## Payment-rail enforcement (Stripe Issuing)

Software `denied` is advisory. `POST /api/issuing/card { apiKey, proofId? }` issues a
single-use **virtual card** whose per-authorization limit equals the proof's
`maxAmount` ([lib/issuing.ts](../lib/issuing.ts)) — the card network enforces the cap
whether or not the agent obeys. Env-gated; returns a friendly 503 until set:

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_ISSUING_CARDHOLDER=ich_…
```

Amount caps are enforced at the rail; merchant-domain scoping stays in AgentPass policy.

## Human-in-the-loop approval links

When an action is `human_review`, the eval response includes an `approvalLink` — a
signed, expiring, single-use URL ([lib/approval-token.ts](../lib/approval-token.ts)).
The token *is* the authority, so the owner can approve from a phone with no login:

```
GET  /api/approval/resolve?token=…&decision=approved     ← one-tap
POST /api/approval/resolve { token, decision }            ← programmatic
```

Set `APPROVAL_WEBHOOK_URL` (or `SLACK_WEBHOOK_URL`) to push the link out-of-band;
otherwise it is returned in the API response.

## Open verification (no trust in AgentPass)

[lib/agentpass-verify.ts](../lib/agentpass-verify.ts) is a zero-dependency module a
merchant can publish/vendor. Fetch the key from `GET /api/signing-key`, then verify
any receipt or proof locally — `verifyReceipt(receipt, publicKeyHex)` — without ever
calling AgentPass. The integration test cross-checks a real server receipt to catch
canonical drift.

## Tests

- Unit: `node --experimental-strip-types --test lib/*.test.ts` (policy, sdk, approval-token, issuing, verify — 25 tests)
- `scripts/sdk-test.ts` — enforcement end-to-end (tool body never executes on denial)
- `scripts/features-test.ts` — approval-link resolution + open verification end-to-end
