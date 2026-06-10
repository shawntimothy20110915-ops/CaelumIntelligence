import { NextResponse } from 'next/server'
import { signingPublicKeyHex } from '@/lib/crypto'

/** Public Ed25519 verification key. Anyone can verify a receipt signature with this. */
export async function GET() {
  return NextResponse.json({
    algorithm: 'Ed25519',
    publicKeyHex: signingPublicKeyHex(),
    usage: 'verify(canonicalReceipt, base64url(signature)) — see /api/verify',
  })
}
