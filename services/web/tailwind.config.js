/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0c0816',
        card: {
          DEFAULT: '#150f24',
          sub: '#1b132e',
          hover: '#1e1533',
        },
        sidebar: '#0f0a1c',
        border: {
          DEFAULT: '#261b3d',
          light: '#362754',
          focus: '#9333ea',
        },
        input: '#120c21',
        pill: '#23183b',
        primary: {
          DEFAULT: '#9333ea',
          hover: '#a855f7',
          dim: 'rgba(147, 51, 234, 0.12)',
          glow: 'rgba(147, 51, 234, 0.25)',
        },
        text: {
          main: '#ffffff',
          muted: '#958da6',
          dim: '#6b637d',
        },
        status: {
          online: '#10b981',
          warn: '#f59e0b',
          error: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

