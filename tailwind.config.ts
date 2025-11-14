import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          100: 'var(--color-background-primary, var(--bg-primary))',
          200: 'var(--color-background-secondary, var(--bg-secondary))'
        },
        text: {
          base: 'var(--color-text-primary, var(--text-primary))',
          secondary: 'var(--color-text-secondary, var(--text-secondary))',
          muted: 'var(--color-text-muted, var(--text-muted))'
        },
        border: {
          DEFAULT: 'var(--color-border-primary, var(--border-primary))'
        },
        accent: {
          DEFAULT: 'var(--color-accent-primary, hsl(var(--accent-primary-h) var(--accent-primary-s) var(--accent-primary-l) / <alpha-value>))'
        },
        canvas: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc"
        }
      },
      ringColor: {
        accent: 'var(--color-accent-primary)'
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)'
      },
      boxShadow: {
        panel: "0 16px 40px -24px rgba(15, 23, 42, 0.45)"
      },
      gridTemplateColumns: {
        panel: "360px minmax(0, 1fr)"
      },
      transitionTimingFunction: {
        'ease-out-quad': 'var(--ease-out-quad)',
        'ease-in-out-sine': 'var(--ease-in-out-sine)',
        'ease-out-expo': 'var(--ease-out-expo)',
        'ease-out-quint': 'var(--ease-out-quint)'
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-smooth) var(--ease-out-quad) forwards',
        shimmer: 'shimmer 1.8s linear infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
};

export default config;
