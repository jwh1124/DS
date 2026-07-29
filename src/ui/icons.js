const ICONS = new Set([
  'book', 'candle', 'cathedral', 'coins', 'comet', 'cross', 'cycle', 'diamond',
  'dove', 'flame', 'fleur', 'heart', 'lightning', 'lock', 'shield', 'skull',
  'star', 'sword', 'target', 'volume', 'volume-off'
]);

export function iconMarkup(name, className = '') {
  const safeName = ICONS.has(name) ? name : 'cross';
  const safeClass = className.replace(/[^a-z0-9 _-]/gi, '').trim();
  const classes = ['ui-icon', safeClass].filter(Boolean).join(' ');
  return `<svg class="${classes}" aria-hidden="true" focusable="false"><use href="./icons.svg#ui-${safeName}"></use></svg>`;
}

export function labeledIconMarkup(name, label) {
  return `${iconMarkup(name)}<span class="control-label">${label}</span>`;
}
