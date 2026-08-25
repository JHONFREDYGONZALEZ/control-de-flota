import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5F6F8',
        panel: '#FFFFFF',
        panelAlt: '#F0F1F4',
        panelHover: '#E7E9ED',
        border: '#DFE2E7',
        text: '#181B20',
        dim: '#5B6270',
        amber: '#B45309',
        red: '#DC2626',
        teal: '#0D9488',
        blue: '#2563EB',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { xl2: '10px' },
    },
  },
  plugins: [],
};
export default config;
