import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        office: {
          bg: '#1a1a2e',
          panel: '#16213e',
          border: '#0f3460',
          accent: '#e94560',
          text: '#eee',
          muted: '#888',
        },
      },
    },
  },
  plugins: [],
};

export default config;
