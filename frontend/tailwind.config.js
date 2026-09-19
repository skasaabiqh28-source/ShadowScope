/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    borderRadius: {
      none: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '0px',
    },
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0a0a0a',
          primary: '#33ff00',
          secondary: '#ffb000',
          muted: '#1f521f',
          dim: '#0d220d',
          dark: '#050c05',
          border: '#1f521f',
          error: '#ff3333',
          warn: '#ffb000',
          text: '#33ff00',
          amber: '#ffb000',
        },
        // Alias existing cyber tokens into high-contrast terminal palette for backwards compatibility
        cyber: {
          dark: '#0a0a0a',
          card: '#0a0a0a',
          border: '#1f521f',
          hover: '#0f290f',
          accent: '#33ff00',
          danger: '#ff3333',
          warning: '#ffb000',
          success: '#33ff00',
          text: '#33ff00',
          muted: '#1f521f',
        }
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { textShadow: '0 0 4px rgba(51,255,0,0.4)' },
          '50%': { textShadow: '0 0 12px rgba(51,255,0,0.8)' },
        },
      },
      boxShadow: {
        'terminal-glow': '0 0 8px rgba(51, 255, 0, 0.3)',
        'terminal-glow-lg': '0 0 16px rgba(51, 255, 0, 0.4)',
        'amber-glow': '0 0 8px rgba(255, 176, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
