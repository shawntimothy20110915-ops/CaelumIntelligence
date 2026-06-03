export const brand = {
  name: 'AgentPass',
  tagline: 'Trust layer for AI agents',
  colors: {
    bg:        '#0a0a0a',
    surface:   '#141414',
    surface2:  'rgba(20,20,20,0.6)',
    border:    '#222',
    text:      '#fff',
    muted:     '#666',
    subdued:   '#888',
    gold:      '#d4a35a',
    goldDeep:  '#a87c3c',
    accent:    '#6366f1',
    success:   '#10b981',
    warn:      '#f59e0b',
    danger:    '#ef4444',
    info:      '#3b82f6',
  },
  radius: { sm: 6, md: 12, lg: 20, pill: 9999 },
  font: {
    sans: '-apple-system, "Segoe UI", Inter, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    serif: '"Instrument Serif", serif',
  },
  shadow: (c: string, strength = 0.4) => `0 0 24px ${c}${Math.round(strength * 255).toString(16).padStart(2, '0')}`,
} as const

export const nav = [
  { href: '/',            label: 'Home',        icon: '⌂' },
  { href: '/live',        label: 'Live',        icon: '◉' },
  { href: '/onboard',     label: 'Onboard',     icon: '✦' },
  { href: '/playground',  label: 'Playground',  icon: '◆' },
  { href: '/marketplace', label: 'Market',      icon: '⬢' },
  { href: '/leaderboard', label: 'Rank',        icon: '★' },
  { href: '/graph',       label: 'Graph',       icon: '⬡' },
  { href: '/report',      label: 'Report',      icon: '▦' },
  { href: '/dispute',     label: 'Dispute',     icon: '⚑' },
] as const
