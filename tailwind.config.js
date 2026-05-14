/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#1C1C1E',
          secondary: '#6C6C70',
          tertiary: '#AEAEB2',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          bg: '#F2F2F7',
          raised: '#FFFFFF',
          separator: '#E5E5EA',
          fill: '#F2F2F7',
          fillSecondary: '#E5E5EA',
        },
        // Talabk brand palette — primary red
        brand: {
          50:  '#FEF2F1',
          100: '#FDE4E2',
          200: '#FBCBC9',
          300: '#F7A09C',
          400: '#F17068',
          500: '#E84540',
          600: '#E5302A', // primary
          700: '#C42B24',
          800: '#9B1C18',
          900: '#7F1D1D',
          950: '#450A08',
        },
      },
    },
  },
  plugins: [],
};
