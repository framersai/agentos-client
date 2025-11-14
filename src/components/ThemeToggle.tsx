import { useThemeStore, Theme } from '../state/themeStore';

export function ThemeToggle() {
  const { actualTheme, setTheme } = useThemeStore();

  const isDark = actualTheme === 'dark';
  const nextTheme: Theme = isDark ? 'light' : 'dark';

  const handleToggle = () => {
    // If user previously chose system, flip based on actual and persist explicit choice
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/70 text-slate-800 shadow-sm backdrop-blur transition-theme hover:bg-slate-200/70 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-white/10 dark:focus:ring-offset-slate-900"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {/* Organic animated SVG: aura + sun/moon core */}
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <radialGradient id="aura-client" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? "rgba(180,220,255,0.45)" : "rgba(255,170,210,0.35)"} />
            <stop offset="60%" stopColor={isDark ? "rgba(120,180,255,0.15)" : "rgba(255,200,230,0.12)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#aura-client)">
          <animate attributeName="r" dur="3s" values="21;23;21" repeatCount="indefinite" />
        </circle>
        <g>
          <circle fill={isDark ? "hsl(200,80%,65%)" : "hsl(45,95%,60%)"} cx="24" cy="24" r="8">
            <animate attributeName="r" dur="2.8s" values="7.6;8;7.6" repeatCount="indefinite" />
          </circle>
          {isDark ? (
            <circle fill="hsl(220,30%,12%)" cx="28" cy="20" r="8" />
          ) : (
            <circle fill="rgba(255,255,255,0.35)" cx="24" cy="24" r="10">
              <animate attributeName="r" dur="2.8s" values="9.5;10;9.5" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      </svg>
    </button>
  );
}
