import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SWK Green — primary brand colour
        green: {
          50:  '#EAF3DE',
          100: '#C0DD97',
          200: '#97C459',
          300: '#7AB33A',
          400: '#639922',
          500: '#4E7D18',
          600: '#3B6D11',
          700: '#2E560C',
          800: '#27500A',
          900: '#173404',
        },
        // Accent gold for SDG badges & highlights
        gold: {
          50:  '#FAEEDA',
          100: '#FAC775',
          200: '#EF9F27',
          300: '#D4870F',
          400: '#BA7517',
          500: '#9E620F',
          600: '#854F0B',
          700: '#703F08',
          800: '#633806',
          900: '#412402',
        },
        // Trust teal for escrow & verification
        teal: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          200: '#5DCAA5',
          300: '#30B48A',
          400: '#1D9E75',
          500: '#138460',
          600: '#0F6E56',
          700: '#0B5844',
          800: '#085041',
          900: '#04342C',
        },
        // Neutrals
        sand: {
          50:  '#FAF8F3',
          100: '#F3F0E8',
          200: '#E8E4D8',
          300: '#D6D0C0',
          400: '#BAB39F',
          500: '#9E9680',
          600: '#7D7666',
          700: '#5F5A4E',
          800: '#444038',
          900: '#2A2823',
        },
      },
      fontFamily: {
        sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.625rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.875rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':  ['3rem',     { lineHeight: '1.1' }],
        '6xl':  ['3.75rem',  { lineHeight: '1.05' }],
        '7xl':  ['4.5rem',   { lineHeight: '1' }],
      },
      borderRadius: {
        'sm':   '6px',
        DEFAULT:'8px',
        'md':   '10px',
        'lg':   '14px',
        'xl':   '18px',
        '2xl':  '24px',
        '3xl':  '32px',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'card-lg': '0 8px 24px 0 rgb(0 0 0 / 0.10), 0 4px 8px -2px rgb(0 0 0 / 0.06)',
        'glow-green': '0 0 0 3px rgb(59 109 17 / 0.15)',
        'glow-gold':  '0 0 0 3px rgb(186 117 23 / 0.20)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'shimmer':       'shimmer 1.8s infinite',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee':       'marquee 28s linear infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:{ from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        marquee:  { from: { transform: 'translateX(0%)' }, to: { transform: 'translateX(-50%)' } },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'dot-pattern': "radial-gradient(circle, #3B6D11 1px, transparent 1px)",
        'leaf-pattern': "url('/images/leaf-pattern.svg')",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}

export default config
