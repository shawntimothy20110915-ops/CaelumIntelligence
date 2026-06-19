export interface Session { token: string; email: string; name: string }
export interface Passport { id: string; agentName: string; status: string; permissions: string[]; expiresAt: string }
export interface DelegationLink { childId: string; parentId: string; ttl: string; createdAt: string }
export interface Agent { id: string; name: string; description: string; model: string; capabilities: string[]; passportId: string; status: string; createdAt: string }
export interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string }
export interface ActivityEntry { id: string; action: string; detail: string; ts: string }

export const API = '/api'
export const ALL_PERMISSIONS = ['purchase', 'search', 'refund', 'booking', 'transfer']
export const ALL_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash']
export const TTL_OPTIONS = [
  { label: '15 minutes', value: '15m' },
  { label: '1 hour',     value: '1h'  },
  { label: '6 hours',    value: '6h'  },
  { label: '24 hours',   value: '24h' },
  { label: '7 days',     value: '7d'  },
]
