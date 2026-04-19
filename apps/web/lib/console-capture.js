/**
 * Console capture utility that sends console logs to the parent AppGen window.
 */

const IGNORE_LIST = [
  /Download the React DevTools/,
  /You are running a development build of React/,
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: React does not recognize/,
  /\[Fast Refresh\]/,
  /\[HMR\]/,
  /Compiled successfully/,
  /Compiling/,
  /webpack/i,
  /next-dev/,
];

function serialize(value) {
  try {
    return JSON.parse(JSON.stringify(value, (_, v) => {
      if (typeof v === 'function') return '[Function]';
      if (typeof v === 'symbol') return v.toString();
      if (typeof v === 'undefined') return '[undefined]';
      if (typeof v === 'bigint') return v.toString() + 'n';
      if (v instanceof Date) return { __t: 'Date', v: v.toISOString() };
      if (v instanceof Error) return { __t: 'Error', v: { name: v.name, message: v.message, stack: v.stack } };
      if (v !== null && typeof v === 'object') {
        if (v.$$typeof) return '[React Element]';
        if (v.nodeType) return '[DOM Node]';
      }
      return v;
    }));
  } catch {
    return String(value);
  }
}

if (typeof window !== 'undefined') {
  const levels = ['log', 'info', 'warn', 'error', 'debug', 'table', 'trace'];

  for (const level of levels) {
    const orig = console[level]?.bind(console);
    console[level] = (...args) => {
      orig?.(...args);
      if (IGNORE_LIST.some((regex) => typeof args[0] === 'string' && regex.test(args[0]))) return;
      try {
        if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
          window.parent.postMessage(
            { type: 'appgen:console', level, args: args.map(serialize), timestamp: Date.now() },
            '*'
          );
        }
      } catch { /* ignore */ }
    };
  }

  if (typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('error', (event) => {
        try {
          if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({
              type: 'appgen:console', level: 'error',
              args: [JSON.stringify({ __t: 'Error', v: { name: 'UncaughtError', message: event.message, stack: 'at ' + event.filename + ':' + event.lineno + ':' + event.colno } })],
              timestamp: Date.now(),
            }, '*');
          }
        } catch { /* ignore */ }
      });

      window.addEventListener('unhandledrejection', (event) => {
        try {
          if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
            const reason = event.reason;
            window.parent.postMessage({
              type: 'appgen:console', level: 'error',
              args: [serialize(reason instanceof Error ? { __t: 'Error', v: { name: reason.name, message: reason.message, stack: reason.stack } } : reason)],
              timestamp: Date.now(),
            }, '*');
          }
        } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
  }
}
