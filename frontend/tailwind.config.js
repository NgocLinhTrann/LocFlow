/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // High-end Indigo-to-Violet branding palette
        brand: {
          50: '#f5f6ff',
          100: '#ebecfe',
          200: '#dbdffd',
          300: '#c1c7fc',
          400: '#a0a7fa',
          500: '#7c81f7',
          600: '#6366f1', // Vibrant Indigo
          700: '#4f46e5', // Brand Primary
          800: '#3f37c9',
          900: '#2f279f',
          950: '#171549',
        },
        // Deep obsidian colors for sidebar contrast
        obsidian: {
          50: '#f4f5f6',
          100: '#e9ebed',
          200: '#c9cfd3',
          300: '#a9b3ba',
          400: '#697a86',
          500: '#294153',
          600: '#213442',
          700: '#192732',
          800: '#111a21',
          900: '#0b1015',
          950: '#05070a',
        }
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(17, 24, 39, 0.03), 0 2px 8px -1px rgba(17, 24, 39, 0.02)',
        'glow-brand': '0 0 15px -3px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 1.8s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
