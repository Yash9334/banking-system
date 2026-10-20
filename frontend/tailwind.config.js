/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0a2540', 700: '#1a3a5c', 500: '#425466', 400: '#697386', 300: '#8792a2' },
        surface: '#f6f9fc',
        line: '#e3e8ee',
        brand: { DEFAULT: '#2563eb', dark: '#1d4ed8', light: '#eff6ff' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,37,64,0.04), 0 1px 3px rgba(10,37,64,0.06)',
      },
    },
  },
  plugins: [],
}
