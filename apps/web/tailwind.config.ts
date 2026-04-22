import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f0e2',
        ink: '#1f1b16',
        brass: '#8a6234',
        moss: '#46543f',
        plum: '#5a394b',
      },
      boxShadow: {
        folio: '0 24px 60px rgba(47, 34, 22, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
