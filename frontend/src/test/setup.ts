import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './msw/server';

if (typeof window !== 'undefined' && !window.BroadcastChannel && typeof BroadcastChannel !== 'undefined') {
  window.BroadcastChannel = BroadcastChannel;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
