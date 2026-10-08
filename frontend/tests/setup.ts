import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockControls } from '../src/api/mock/mockApi';
import { clearRequestCache } from '../src/hooks/useRequest';

// jsdom has no layout engine; the charts only need ResizeObserver to exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
window.scrollTo = () => {};

beforeEach(() => {
  mockControls.latencyMs = 0;
  mockControls.offline = false;
  clearRequestCache();
  window.location.hash = '';
});

afterEach(() => cleanup());
