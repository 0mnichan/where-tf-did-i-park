const DIGIPIN_CHARS = [
  ['F', 'C', '9', '8'],
  ['J', '3', '2', '7'],
  ['K', '4', '5', '6'],
  ['L', 'M', 'P', 'T'],
]

const LAT_MIN = 8.0
const LAT_MAX = 37.0
const LNG_MIN = 68.0
const LNG_MAX = 98.0
const LEVELS = 10

export function encodeDIGIPIN(lat: number, lng: number): string {
  let latMin = LAT_MIN, latMax = LAT_MAX
  let lngMin = LNG_MIN, lngMax = LNG_MAX
  let result = ''

  for (let i = 0; i < LEVELS; i++) {
    const latDiv = (latMax - latMin) / 4
    const lngDiv = (lngMax - lngMin) / 4

    const row = Math.min(3, Math.floor((latMax - lat) / latDiv))
    const col = Math.min(3, Math.floor((lng - lngMin) / lngDiv))

    result += DIGIPIN_CHARS[row][col]

    latMax = latMax - row * latDiv
    latMin = latMax - latDiv
    lngMin = lngMin + col * lngDiv
    lngMax = lngMin + lngDiv
  }

  return result.slice(0, 3) + '-' + result.slice(3, 7) + '-' + result.slice(7)
}

export function decodeDIGIPIN(digipin: string): { lat: number; lng: number } {
  const clean = digipin.replace(/-/g, '')

  let latMin = LAT_MIN, latMax = LAT_MAX
  let lngMin = LNG_MIN, lngMax = LNG_MAX

  for (const char of clean) {
    let row = -1, col = -1
    outer: for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (DIGIPIN_CHARS[r][c] === char) {
          row = r
          col = c
          break outer
        }
      }
    }
    if (row === -1) throw new Error(`Invalid DIGIPIN character: ${char}`)

    const latDiv = (latMax - latMin) / 4
    const lngDiv = (lngMax - lngMin) / 4

    latMax = latMax - row * latDiv
    latMin = latMax - latDiv
    lngMin = lngMin + col * lngDiv
    lngMax = lngMin + lngDiv
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  }
}
