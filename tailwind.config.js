/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        card: 'var(--card)',
        task: 'var(--task)',
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)'
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          muted: 'var(--foreground-muted)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          900: 'var(--primary-900)',
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
        'card-dark': "0 1px 1px 0 rgba(0, 0, 0, 0.6), 0 2px 3px 0 rgba(0, 0, 0, 0.4)"
      }
    }
  },
  plugins: []
};




