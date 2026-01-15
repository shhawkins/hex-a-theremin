/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hex-bg': '#050505',
        'hex-panel': '#111111',
        'hex-border': '#333333',
        'hex-accent': '#00f0ff', // Cyan
        'hex-accent-dim': 'rgba(0, 240, 255, 0.2)',
        'hex-secondary': '#ff0055', // Pink
        'hex-text': '#e0e0e0',
        'hex-text-dim': '#888888',
      },
      fontFamily: {
        mono: ['Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 10px rgba(0, 240, 255, 0.5)',
        'glow-sm': '0 0 5px rgba(0, 240, 255, 0.3)',
      }
    },
  },
  plugins: [],
}