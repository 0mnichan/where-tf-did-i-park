const colorMap: Record<string, string> = {
  black: '#1a1a1a',
  'matte black': '#1a1a1a',
  'jet black': '#1a1a1a',
  white: '#f5f5f5',
  'pearl white': '#f5f5f5',
  'ivory white': '#f5f5f5',
  red: '#e63946',
  blue: '#2196f3',
  'navy blue': '#1a237e',
  green: '#4caf50',
  silver: '#9e9e9e',
  grey: '#757575',
  gray: '#757575',
  yellow: '#fdd835',
  orange: '#ff9800',
  brown: '#795548',
  maroon: '#880e4f',
  purple: '#9c27b0',
  pink: '#e91e63',
  gold: '#ffc107',
  'golden yellow': '#ffc107',
  'racing red': '#e63946',
  'midnight blue': '#0d47a1',
}

export function colorNameToHex(name: string): string {
  const lower = name.toLowerCase().trim()
  if (colorMap[lower]) return colorMap[lower]
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lower.includes(key)) return hex
  }
  return '#c8f542'
}
