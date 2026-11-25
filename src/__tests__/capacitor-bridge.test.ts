import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  drainNativePendingIntents,
  handleAndroidBackButton,
  checkNativePendingSavedArticles,
} from '../client/native/capacitor';

describe('Capacitor Native Bridge Helpers', () => {
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;

  beforeEach(() => {
    (globalThis as any).window = {};
    (globalThis as any).document = {
      querySelector: vi.fn().mockReturnValue(null),
      getElementById: vi.fn().mockReturnValue(null),
      body: { classList: { contains: vi.fn().mockReturnValue(false) } },
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    vi.restoreAllMocks();
  });

  it('drains pending openReader ID and shared text from AndroidNative', () => {
    const openReader = vi.fn();
    const handleAndroidSharedText = vi.fn();
    let pendingId = 42;
    let pendingText = 'Check this out https://example.com/post';

    (globalThis as any).window = {
      openReader,
      handleAndroidSharedText,
      AndroidNative: {
        pollPendingOpenReaderId: () => {
          const v = pendingId;
          pendingId = -1;
          return v;
        },
        pollPendingSharedText: () => {
          const v = pendingText;
          pendingText = '';
          return v;
        },
      },
    };

    drainNativePendingIntents();
    expect(openReader).toHaveBeenCalledTimes(1);
    expect(openReader).toHaveBeenCalledWith(42);
    expect(handleAndroidSharedText).toHaveBeenCalledTimes(1);
    expect(handleAndroidSharedText).toHaveBeenCalledWith('Check this out https://example.com/post');

    // Second call should be a no-op since both were atomically cleared
    drainNativePendingIntents();
    expect(openReader).toHaveBeenCalledTimes(1);
    expect(handleAndroidSharedText).toHaveBeenCalledTimes(1);
  });

  it('does not recurse when window.handleAndroidBackButton references handleAndroidBackButton', () => {
    const exitApp = vi.fn();
    (globalThis as any).window = {
      handleAndroidBackButton,
      Capacitor: { Plugins: { App: { exitApp } } },
    };

    expect(() => handleAndroidBackButton()).not.toThrow();
    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it('polls AndroidNative.pollPendingSavedArticles and prepends saved articles', async () => {
    const prependSavedArticles = vi.fn();
    const openReader = vi.fn();
    (globalThis as any).window = {
      prependSavedArticles,
      openReader,
      AndroidNative: {
        pollPendingSavedArticles: () => JSON.stringify([{ id: 7, title: 'Saved via Share' }]),
        pollPendingOpenReaderId: () => 7,
      },
    };

    await checkNativePendingSavedArticles();
    expect(prependSavedArticles).toHaveBeenCalledWith([{ id: 7, title: 'Saved via Share' }]);
    expect(openReader).toHaveBeenCalledWith(7);
  });
});
