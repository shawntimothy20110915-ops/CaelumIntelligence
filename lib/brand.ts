export const brand = {
  name: 'AgentPass',
  tagline: 'Trust layer for AI agents',
  // Monochrome "constellation" palette — one bg, one ink. Former accents
  // (gold/accent/success/warn/danger/info) collapse to ink; status is
  // expressed via opacity, glyphs and motion, not hue. Matches Caelum.
  colors: {
    bg:        '#060607',
    surface:   '#0c0c0e',
    surface2:  'rgba(244,244,239,0.04)',
    border:    'rgba(244,244,239,0.12)',
    text:      '#f4f4ef',
    muted:     'rgba(244,244,239,0.45)',
    subdued:   'rgba(244,244,239,0.62)',
    gold:      '#f4f4ef',
    goldDeep:  'rgba(244,244,239,0.62)',
    accent:    '#f4f4ef',
    success:   '#f4f4ef',
    warn:      '#f4f4ef',
    danger:    '#f4f4ef',
    info:      '#f4f4ef',
  },
  radius: { sm: 6, md: 12, lg: 20, pill: 9999 },
  font: {
    sans: '"DM Sans", -apple-system, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    serif: '"Bricolage Grotesque", sans-serif',
  },
  shadow: (c: string, strength = 0.4) => `0 0 24px ${c}${Math.round(strength * 255).toString(16).padStart(2, '0')}`,
} as const

export const nav: ReadonlyArray<{ href: string; label: string; icon: string }> = []
