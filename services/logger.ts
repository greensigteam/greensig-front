type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ImportMetaEnvLike {
  env?: { MODE?: string };
}

let enabled = true;
try {
  const meta = import.meta as ImportMetaEnvLike;
  const mode = meta?.env?.MODE;
  enabled = mode !== 'production';
} catch {
  enabled = true;
}

function formatTimestamp() {
  return new Date().toISOString();
}

function output(level: LogLevel, namespace: string | undefined, args: unknown[]) {
  if (!enabled) return;
  const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}]${namespace ? ` [${namespace}]` : ''}`;
  const fn = console[level] ?? console.log;
  fn(prefix, ...args);
}

export function createLogger(namespace?: string) {
  return {
    debug: (...args: unknown[]) => output('debug', namespace, args),
    info: (...args: unknown[]) => output('info', namespace, args),
    warn: (...args: unknown[]) => output('warn', namespace, args),
    error: (...args: unknown[]) => output('error', namespace, args),
  };
}

export function setLoggingEnabled(v: boolean) {
  enabled = v;
}

export function isLoggingEnabled() {
  return enabled;
}

export default createLogger();
