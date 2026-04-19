import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, isLoggingEnabled, setLoggingEnabled } from '../logger';

describe('logger', () => {
  const spies = {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
  };

  beforeEach(() => {
    setLoggingEnabled(true);
    for (const s of Object.values(spies)) s.mockClear();
  });

  afterEach(() => {
    setLoggingEnabled(true);
  });

  it('isLoggingEnabled reflects setLoggingEnabled', () => {
    setLoggingEnabled(false);
    expect(isLoggingEnabled()).toBe(false);
    setLoggingEnabled(true);
    expect(isLoggingEnabled()).toBe(true);
  });

  it('createLogger returns four level methods', () => {
    const log = createLogger();
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('each level routes to the matching console method with a formatted prefix', () => {
    const log = createLogger('NS');
    log.debug('dmsg');
    log.info('imsg');
    log.warn('wmsg');
    log.error('emsg');

    expect(spies.debug).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);

    const debugCall = spies.debug.mock.calls[0]?.[0] as string;
    expect(debugCall).toMatch(/^\[.+\] \[DEBUG\] \[NS\]$/);
    expect(spies.debug.mock.calls[0]?.[1]).toBe('dmsg');
  });

  it('formats without namespace when none given', () => {
    const log = createLogger();
    log.info('hi');
    const prefix = spies.info.mock.calls[0]?.[0] as string;
    expect(prefix).toMatch(/^\[.+\] \[INFO\]$/);
    expect(prefix).not.toContain('[undefined]');
  });

  it('does not emit when logging is disabled', () => {
    setLoggingEnabled(false);
    const log = createLogger('NS');
    log.info('suppressed');
    log.error('suppressed');
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.error).not.toHaveBeenCalled();
  });
});
