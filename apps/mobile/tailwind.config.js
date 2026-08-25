/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Calm / trustworthy / health-focused palette (spec section 38) —
        // muted teal-green primary, soft neutrals, no medical-white or
        // bodybuilding-red aesthetic.
        primary: {
          50: '#f0fdf6',
          100: '#dbfbe9',
          200: '#b8f5d3',
          300: '#84e9b3',
          400: '#4bd58c',
          500: '#22b56d',
          600: '#159157',
          700: '#137447',
          800: '#135c3a',
          900: '#114c31',
        },
        surface: {
          light: '#ffffff',
          dark: '#121712',
        },
        muted: {
          light: '#f4f6f5',
          dark: '#1c221d',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
