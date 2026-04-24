const EMOJI_POOL = [
  "🔥","⚡","🌊","🌪","🎯","🦊","🐯","🦁","🐻","🦋",
  "🌵","🍄","🎸","🎺","🚀","🛸","💎","🔮","🧲","⚙️",
  "🎭","🏆","🎪","🌋","🗿","🦅","🐉","🌙","☄️","🎲",
  "🧨","🪬","🦂","🪄","🎰","🏴‍☠️","🌀","💥","🎃","🔱",
  "⚔️","🛡️","🗡️","🧿","🪩","🎆","🌈","🧊","🪸","🦈",
  "🐊","🦖","🦕","🐙","🦑","🦞","🦀","🐡","🦭","🦧",
  "🐺","🦝","🦨","🦡","🦫","🦦","🦥","🐿️","🦔","🐾",
  "🌺","🌸","🌼","🌻","🍁","🍀","🌿","🪨","🪵","🌾"
]

export function digipinToEmojis(digipin: string): [string, string, string] {
  const clean = digipin.replace(/-/g, '').slice(0, 7)
  const charValues = clean.split('').map(c => c.charCodeAt(0))
  const seed1 = (charValues[0] * 31 + charValues[1] * 17 + charValues[2] * 7) % EMOJI_POOL.length
  const seed2 = (charValues[2] * 31 + charValues[3] * 17 + charValues[4] * 7 + charValues[0]) % EMOJI_POOL.length
  const seed3 = (charValues[4] * 31 + charValues[5] * 17 + charValues[6] * 7 + charValues[1]) % EMOJI_POOL.length
  const e1 = seed1
  const e2 = seed2 === e1 ? (seed2 + 1) % EMOJI_POOL.length : seed2
  const e3 = seed3 === e1 || seed3 === e2 ? (seed3 + 2) % EMOJI_POOL.length : seed3
  return [EMOJI_POOL[e1], EMOJI_POOL[e2], EMOJI_POOL[e3]]
}

export function isSameZone(digipin1: string, digipin2: string): boolean {
  const clean1 = digipin1.replace(/-/g, '').slice(0, 7)
  const clean2 = digipin2.replace(/-/g, '').slice(0, 7)
  return clean1 === clean2
}
