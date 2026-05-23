const fs = require('fs');
const path = require('path');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
const root = path.resolve(__dirname, '..', 'src');
const files = walk(root).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
const replacements = [
  ['dark:bg-slate-900/30', 'dark:bg-surface-strong/30'],
  ['dark:bg-slate-900/20', 'dark:bg-surface-strong/20'],
  ['dark:bg-slate-950/60', 'dark:bg-surface-strong/60'],
  ['bg-slate-950/70', 'bg-surface-strong/70'],
  ['bg-slate-900/50', 'bg-surface-strong/50'],
  ['bg-slate-900/60', 'bg-surface-strong/60'],
  ['bg-slate-800/60', 'bg-surface-strong/60'],
  ['bg-slate-800/50', 'bg-surface-strong/50'],
  ['dark:bg-slate-900', 'dark:bg-surface-strong'],
  ['dark:bg-slate-800', 'dark:bg-surface-strong'],
  ['bg-slate-900', 'bg-surface-strong'],
  ['bg-slate-800', 'bg-surface-strong'],
  ['bg-slate-100', 'bg-surface'],
  ['bg-slate-50', 'bg-background'],
  ['bg-white', 'bg-surface'],
  ['border-slate-100', 'border-border'],
  ['border-slate-200', 'border-border'],
  ['border-slate-300', 'border-border'],
  ['dark:border-slate-800', 'dark:border-border'],
  ['dark:border-slate-700', 'dark:border-border'],
  ['dark:border-slate-600', 'dark:border-border'],
  ['text-slate-900', 'text-text'],
  ['text-slate-800', 'text-text'],
  ['text-slate-700', 'text-text'],
  ['text-slate-600', 'text-muted'],
  ['text-slate-500', 'text-muted'],
  ['text-slate-400', 'text-muted'],
  ['text-slate-300', 'text-muted'],
  ['dark:text-slate-100', 'text-text'],
  ['dark:text-slate-300', 'text-muted'],
  ['dark:text-slate-400', 'text-muted'],
  ['dark:text-slate-500', 'text-muted'],
  ['dark:text-slate-600', 'text-muted'],
  ['hover:bg-slate-100', 'hover:bg-surface'],
  ['bg-slate-900/20', 'bg-surface-strong/20'],
  ['bg-slate-100/80', 'bg-surface/80'],
  ['dark:border-slate-900', 'dark:border-border'],
];
let touched = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    touched += 1;
    console.log('Updated', path.relative(root, file));
  }
}
console.log('Files touched:', touched);
