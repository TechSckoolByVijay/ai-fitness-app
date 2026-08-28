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
