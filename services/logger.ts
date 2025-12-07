type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let enabled = true;
try {
  const meta: any = (import.meta as any);
  const mode = meta?.env?.MODE;
  enabled = mode !== 'production';
} catch (e) {
  enabled = true;
}

function formatTimestamp() {
  return new Date().toISOString();
}

function output(level: LogLevel, namespace: string | undefined, args: any[]) {
  if (!enabled) return;
  const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}]${namespace ? ` [${namespace}]` : ''}`;
  const logger = console as any;
  if (logger[level]) {
    logger[level](prefix, ...args);
  } else {
    logger.log(prefix, ...args);
  }
}

export function createLogger(namespace?: string) {
  return {
    debug: (...args: any[]) => output('debug', namespace, args),
    info: (...args: any[]) => output('info', namespace, args),
    warn: (...args: any[]) => output('warn', namespace, args),
    error: (...args: any[]) => output('error', namespace, args),
  };
}

export function setLoggingEnabled(v: boolean) {
  enabled = v;
}

export function isLoggingEnabled() {
  return enabled;
}

export default createLogger();
