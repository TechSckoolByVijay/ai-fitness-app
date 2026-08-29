/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Vivid, energetic green — the app's single hero color. Everything
        // else on screen stays soft/neutral so this one color (plus the
        // amber/sky semantic accents used inline) carries the personality.
        primary: {
          50: '#ecfdf3',
          100: '#d2fbe3',
          200: '#a9f4ca',
          300: '#71e8ac',
          400: '#38d489',
          500: '#12c06e',
          600: '#0aa25c',
          700: '#0b7f4b',
          800: '#0e653e',
          900: '#0d5334',
          950: '#06301e',
        },
        // Semantic status colors. These exist so that "this is going well"
        // and "this needs your attention" are never rendered in the same
        // color — previously every status message inherited brand green,
        // which made a warning look like praise. `primary` doubles as the
        // positive tone; these two cover the other end of the scale.
        // See src/utils/statusTone.ts for the single mapping that uses them.
        caution: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        // Page background is deliberately NOT white — a soft gray-green so
        // white cards visibly float on top of it (depth, like the reference
        // fitness apps), instead of white-on-white flatness.
        surface: {
          light: '#f2f5f3',
          dark: '#0c110d',
        },
        muted: {
          light: '#e9eeeb',
          dark: '#1a231c',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
