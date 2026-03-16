import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureError, initErrorTracking } from '../errorTracking';

describe('captureError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs to console.error in development', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    captureError(new Error('test error'), 'test context');
    expect(spy).toHaveBeenCalled();
  });

  it('handles non-Error objects gracefully', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Should not throw
    expect(() => captureError('string error')).not.toThrow();
    expect(() => captureError(42)).not.toThrow();
    expect(() => captureError(null)).not.toThrow();
  });
});

describe('initErrorTracking', () => {
  it('returns a cleanup function', () => {
    const cleanup = initErrorTracking();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('registers and deregisters window event listeners', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const cleanup = initErrorTracking();

    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    cleanup();

    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    vi.restoreAllMocks();
  });
});
