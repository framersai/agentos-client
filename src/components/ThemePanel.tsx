import { useState } from "react";
import { useThemeStore, type Theme, type Appearance, type Palette } from "../state/themeStore";

export function ThemePanel() {
  const { theme, setTheme, actualTheme, appearance, setAppearance, palette, setPalette } = useThemeStore();
  const [open, setOpen] = useState(true);

  const themes: Array<{ key: Theme; label: string }> = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "System" },
  ];

  const appearances: Array<{ key: Appearance; label: string; hint: string }> = [
    { key: "default", label: "Default", hint: "Balanced spacing and borders" },
    { key: "compact", label: "Compact", hint: "Tighter spacing for dense views" },
    { key: "contrast", label: "High contrast", hint: "Stronger borders and text" },
  ];

  const palettes: Array<{ key: Palette; label: string }> = [
    { key: "default", label: "Default" },
    { key: "sakura", label: "Sakura Sunset" },
    { key: "twilight", label: "Twilight Neo" },
    { key: "aurora", label: "Aurora Daybreak" },
    { key: "warm", label: "Warm Embrace" },
    { key: "terminus-amber", label: "Terminus (Amber)" },
    { key: "terminus-green", label: "Terminus (Green)" },
    { key: "terminus-white", label: "Terminus (White)" },
    { key: "sunset", label: "Sunset (legacy)" },
  ];

  return (
    <section className="card-panel--strong p-5 transition-theme">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] theme-text-muted">Theme</p>
          <h3 className="text-lg font-semibold theme-text-primary">Display preferences</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-3 py-1 text-xs theme-text-secondary transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? "Hide" : "Show"}
        </button>
      </header>

      {open && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.35em] theme-text-muted">Mode</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    theme === opt.key
                      ? "theme-bg-accent theme-text-on-accent border-transparent shadow-sm"
                      : "theme-text-secondary theme-bg-secondary theme-border hover:opacity-95"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs theme-text-muted">Active: {actualTheme}</p>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.35em] theme-text-muted">Appearance</p>
            <div className="flex flex-wrap gap-2">
              {appearances.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAppearance(opt.key)}
                  title={opt.hint}
                  className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    appearance === opt.key
                      ? "theme-bg-accent theme-text-on-accent border-transparent shadow-sm"
                      : "theme-text-secondary theme-bg-secondary theme-border hover:opacity-95"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.35em] theme-text-muted">Style</p>
            <div className="flex flex-wrap gap-2">
              {palettes.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPalette(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    palette === opt.key
                      ? "theme-bg-accent theme-text-on-accent border-transparent shadow-sm"
                      : "theme-text-secondary theme-bg-secondary theme-border hover:opacity-95"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs theme-text-muted">Changes accent colors to match landing page themes.</p>
          </div>
        </div>
      )}
    </section>
  );
}
