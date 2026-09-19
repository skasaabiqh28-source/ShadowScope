/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0d14',
          card: '#111622',
          border: '#1e2638',
          hover: '#192132',
          accent: '#3b82f6',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          text: '#f3f4f6',
          muted: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}
