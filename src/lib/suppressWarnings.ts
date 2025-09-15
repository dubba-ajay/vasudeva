// Suppress specific noisy warnings in browser environments that originate from third-party libs
// Run in all environments (dev/preview) to filter known non-actionable noise while keeping other logs intact
if (typeof window !== 'undefined') {
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  const FILTERS = [
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop completed',
    'Support for defaultProps will be removed from function components',
    'defaultProps will be removed',
    'Use JavaScript default parameters instead',
    'Encountered two children with the same key',
  ];
  const FILTER_RE = /defaultProps will be removed/i;

  console.warn = (...args: any[]) => {
    try {
      const msg = args.map(a => {
        try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      if (FILTERS.some(f => msg.includes(f)) || FILTER_RE.test(msg)) return;
    } catch (e) {}
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    try {
      const msg = args.map(a => {
        try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      if (FILTERS.some(f => msg.includes(f)) || FILTER_RE.test(msg)) return;
    } catch (e) {}
    originalError(...args);
  };
}
