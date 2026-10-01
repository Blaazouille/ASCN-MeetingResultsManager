import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
          bright: 'var(--color-success-bright)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        medal: {
          gold: 'var(--color-medal-gold)',
          silver: 'var(--color-medal-silver)',
          bronze: 'var(--color-medal-bronze)',
        },
        marine: {
          DEFAULT: 'var(--color-marine)',
          deep: 'var(--color-marine-deep)',
          raised: 'var(--color-marine-raised)',
          line: 'var(--color-marine-line)',
          soft: 'var(--color-marine-soft)',
        },
        'on-marine': {
          DEFAULT: 'var(--color-on-marine)',
          muted: 'var(--color-on-marine-muted)',
          subtle: 'var(--color-on-marine-subtle)',
          faint: 'var(--color-on-marine-faint)',
        },
        bassin: {
          DEFAULT: 'var(--color-bassin)',
          strong: 'var(--color-bassin-strong)',
          soft: 'var(--color-bassin-soft)',
        },
        corail: {
          DEFAULT: 'var(--color-corail)',
          strong: 'var(--color-corail-strong)',
          soft: 'var(--color-corail-soft)',
          wash: 'var(--color-corail-wash)',
          line: 'var(--color-corail-line)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
          muted: 'var(--color-ink-muted)',
        },
        overlay: 'var(--color-overlay)',
        line: {
          DEFAULT: 'var(--color-line)',
          strong: 'var(--color-line-strong)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          sunken: 'var(--color-surface-sunken)',
          header: 'var(--color-surface-header)',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        body: ['Barlow', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        segment: 'var(--shadow-segment)',
      },
      spacing: {
        sidebar: '248px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
