/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#111111',
        surface2: '#1c1c1c',
        accent: '#c8f542',
        accent2: '#00d4ff',
        gold: '#ffc832',
        danger: '#ff3b30',
        muted: '#4a4a4a',
        border: '#1e1e1e',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
