/**
 * AgentPass open verification — zero dependencies beyond Node's crypto.
 *
 * This is the "verify without trusting AgentPass" surface: a merchant fetches the
 * public key from `/api/signing-key`, then verifies any receipt or proof locally.
 * Nothing here talks to AgentPass servers, so it is safe to publish as a standalone
 * package (`agentpass-verify`). The canonical encoders MUST stay byte-identical to
 * the signer (lib/types.ts); the integration test cross-checks a real server receipt.
 */
import { createPublicKey, verify as edVerify, type KeyObject } from 'crypto'

const ED_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

export function publicKeyFromHex(hex: string): KeyObject {
  return createPublicKey({
    key: Buffer.concat([ED_SPKI_PREFIX, Buffer.from(hex, 'hex')]), format: 'der', type: 'spki',
  })
}

export interface VerifiableReceipt {
  id: string; passportId: string; agentId: string; action: string
  merchant?: string; amount?: number; decision: string; issuedAt: number
  signature?: string
}

export interface VerifiableProof {
  id: string; passportId: string; grantedTo: string; permissions: string[]; issuedAt: number
  constraints: { maxAmount?: number; allowedMerchants?: string[]; expiresAt: number }
  signature?: string
}

export function canonicalReceipt(r: VerifiableReceipt): string {
  return [r.id, r.passportId, r.agentId, r.action, r.merchant ?? '', r.amount ?? '', r.decision, r.issuedAt].join('|')
}

export function canonicalProof(p: VerifiableProof): string {
  return [
    p.id, p.passportId, p.grantedTo, [...p.permissions].sort().join(','),
    p.constraints.maxAmount ?? '', (p.constraints.allowedMerchants ?? []).slice().sort().join(','),
    p.constraints.expiresAt, p.issuedAt,
  ].join('|')
}

function verifySig(data: string, signature: string | undefined, publicKeyHex: string): boolean {
  if (!signature) return false
  try {
    return edVerify(null, Buffer.from(data), publicKeyFromHex(publicKeyHex), Buffer.from(signature, 'base64url'))
  } catch {
    return false
  }
}

export function verifyReceipt(receipt: VerifiableReceipt, publicKeyHex: string): boolean {
  return verifySig(canonicalReceipt(receipt), receipt.signature, publicKeyHex)
}

export function verifyProof(proof: VerifiableProof, publicKeyHex: string): boolean {
  return verifySig(canonicalProof(proof), proof.signature, publicKeyHex)
}
