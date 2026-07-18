import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#10151B',
        panel: '#1A222C',
        panelAlt: '#212B37',
        panelHover: '#25303D',
        border: '#2A3542',
        text: '#E8EAED',
        dim: '#8B96A5',
        amber: '#F2A93B',
        red: '#E4572E',
        teal: '#3FA796',
        blue: '#4C8DAE',
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
