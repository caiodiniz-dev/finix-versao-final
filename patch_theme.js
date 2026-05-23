const fs = require("fs");
const path = require("path");
const files = [
  "frontend/src/contexts/ThemeContext.tsx",
  "frontend/tailwind.config.js",
  "frontend/src/layouts/AppLayout.tsx",
  "frontend/src/pages/Profile.tsx",
  "frontend/src/pages/Categories.tsx",
  "frontend/src/pages/Alerts.tsx",
  "frontend/src/pages/Calendar.tsx",
  "frontend/src/pages/Dashboard.tsx",
  "frontend/src/pages/Plans.tsx",
];
const replacements = {
  "const [theme, setThemeState] = useState<ThemeMode>('light');\n\n  useEffect(() => {\n    if (typeof window === 'undefined') return;\n    const initial = getInitialTheme(storageKey);\n    setThemeState(initial);\n  }, [storageKey]);\n\n  useEffect(() => {\n    if (typeof window === 'undefined') return;\n    window.localStorage.setItem(storageKey, theme);\n  }, [storageKey, theme]);":
    "const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme(storageKey));\n\n  useEffect(() => {\n    if (typeof window === 'undefined') return;\n    window.localStorage.setItem(storageKey, theme);\n  }, [storageKey, theme]);",
  "colors: {\n        brand: {\n          blue: '#2563EB',\n          purple: '#7C3AED',\n          green: '#22C3E6',\n          dark: '#0F172A',\n          light: '#F3F7FF',\n          soft: '#E0E7FF',\n        },\n        surface: '#F8FAFF',\n        background: '#F3F7FF',\n        muted: '#64748B',\n      },":
    "colors: {\n        brand: {\n          blue: '#2563EB',\n          purple: '#7C3AED',\n          green: '#22C55E',\n          dark: '#0F172A',\n          light: '#F3F7FF',\n          soft: '#E0E7FF',\n        },\n        surface: 'var(--color-surface)',\n        'surface-strong': 'var(--color-surface-strong)',\n        background: 'var(--color-background)',\n        border: 'var(--color-border)',\n        'border-strong': 'var(--color-border-strong)',\n        text: 'var(--color-text)',\n        muted: 'var(--color-text-muted)',\n        'text-low': 'var(--color-text-low)',\n        primary: 'var(--color-primary)',\n        'primary-soft': 'var(--color-primary-soft)',\n        secondary: 'var(--color-secondary)',\n        overlay: 'var(--color-overlay)',\n      },",
  "bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800":
    "bg-surface border-r border-border",
  "px-5 py-6 border-b border-slate-100 dark:border-slate-800":
    "px-5 py-6 border-b border-border",
  "text-base font-semibold text-slate-500 dark:text-slate-300":
    "text-text-muted",
  "text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight":
    "text-xl font-display font-bold text-text tracking-tight",
  "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800":
    "text-text-muted hover:bg-surface-strong",
  "bg-slate-50 dark:bg-slate-800": "bg-surface-strong text-text",
  "min-h-screen flex bg-slate-50 dark:bg-slate-950":
    "min-h-screen flex bg-background",
  "lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between":
    "lg:hidden sticky top-0 z-30 bg-surface/80 dark:bg-surface/80 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between",
  "bg-[#0F172A]": "bg-surface",
  "border-slate-700": "border-border",
  "bg-slate-800": "bg-surface-strong",
  "text-slate-100": "text-text",
  "text-slate-400": "text-muted",
  "text-slate-300": "text-muted",
  "text-slate-500": "text-muted",
  "text-slate-900": "text-text",
  "bg-slate-100": "bg-surface-strong",
  "dark:bg-slate-900/50": "bg-surface-strong",
  "border-slate-200": "border-border",
  "dark:border-slate-700": "border-border",
  "bg-white dark:bg-[#0F172A]": "bg-surface",
  "bg-slate-50": "bg-surface",
  "dark:bg-slate-800": "bg-surface-strong",
  "text-slate-700": "text-text",
  "text-slate-600": "text-muted",
  "border-slate-300": "border-border-strong",
  "bg-slate-800/50": "bg-surface-strong/50",
  "bg-slate-100 dark:bg-slate-800": "bg-surface-strong",
  "bg-slate-800 p-4 text-sm text-slate-300":
    "bg-surface-strong p-4 text-sm text-text",
  "bg-slate-800 p-6 text-sm text-slate-300":
    "bg-surface-strong p-6 text-sm text-text",
  "bg-slate-50 dark:bg-slate-900/30": "bg-surface dark:bg-surface-strong/30",
  "bg-slate-100 dark:bg-slate-800": "bg-surface-strong",
  "bg-slate-100": "bg-surface-strong",
  "text-slate-900 dark:text-slate-100": "text-text",
  "text-slate-700 dark:text-slate-200": "text-text",
  "text-slate-400 dark:text-slate-500": "text-muted",
  "bg-slate-100 dark:bg-slate-800 px-2 py-1": "bg-surface-strong px-2 py-1",
  "bg-white dark:bg-[#0F172A]": "bg-surface",
  "border-slate-200 dark:border-slate-700": "border-border",
  "border-slate-100 dark:border-slate-800": "border-border-strong",
  "bg-slate-50 dark:bg-slate-900/20": "bg-surface dark:bg-surface-strong/20",
  "hover:bg-slate-50 dark:hover:bg-slate-800/60":
    "hover:bg-surface/75 dark:hover:bg-surface-strong/60",
  "text-slate-800 dark:text-slate-100": "text-text",
  "bg-slate-200 dark:bg-slate-700": "bg-surface-strong",
  "bg-slate-100 dark:bg-slate-800/50": "bg-surface-strong/50",
  "bg-slate-100": "bg-surface-strong",
  "bg-slate-900/50": "dark:bg-surface-strong/50",
  "card border border-slate-200/80 shadow-sm dark:border-slate-800/80 p-6":
    "card border border-border/80 shadow-sm p-6",
  "text-slate-900 dark:text-white leading-tight": "text-text leading-tight",
  "p-6 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300":
    "p-6 rounded-2xl border border-border bg-surface-strong text-text",
  "border border-slate-700/60 bg-slate-950/70 px-5 py-4 shadow-soft":
    "border border-border/60 bg-surface-strong/70 px-5 py-4 shadow-soft",
  "text-slate-400": "text-muted",
  "bg-slate-900 p-8": "bg-surface-strong p-8",
  "bg-slate-900/60 p-5": "bg-surface-strong/60 p-5",
  "border border-white/7 bg-slate-900/60 p-5":
    "border border-border/70 bg-surface-strong/60 p-5",
};
for (const relativePath of files) {
  const fullPath = path.resolve(relativePath);
  let text = fs.readFileSync(fullPath, "utf-8");
  const original = text;
  for (const [oldStr, newStr] of Object.entries(replacements)) {
    if (text.includes(oldStr)) {
      text = text.split(oldStr).join(newStr);
    }
  }
  if (text !== original) {
    fs.writeFileSync(fullPath, text, "utf-8");
    console.log(`Updated ${relativePath}`);
  }
}
