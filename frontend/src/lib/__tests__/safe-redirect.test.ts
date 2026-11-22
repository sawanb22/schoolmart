import { describe, it, expect } from 'vitest';
import { getSafeRedirect, withRedirect } from '../safe-redirect';

describe('getSafeRedirect', () => {
  it('accepts same-site relative paths', () => {
    expect(getSafeRedirect('/catalogues')).toBe('/catalogues');
    expect(getSafeRedirect('/request-quote?product=desk&qty=2')).toBe('/request-quote?product=desk&qty=2');
  });

  it.each([
    ['empty', ''],
    ['no leading slash', 'catalogues'],
    ['absolute http URL', 'http://evil.example/x'],
    ['absolute https URL', 'https://evil.example/x'],
    ['protocol-relative URL', '//evil.example/x'],
    ['backslash host trick', '/\\evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['whitespace / control chars', '/ok\r\nLocation: x'],
  ])('rejects %s', (_label, value) => {
    expect(getSafeRedirect(value)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(getSafeRedirect(null)).toBeNull();
    expect(getSafeRedirect(undefined)).toBeNull();
  });
});

describe('withRedirect', () => {
  it('appends an encoded redirect for safe paths', () => {
    expect(withRedirect('/login', '/a?b=1')).toBe('/login?redirect=%2Fa%3Fb%3D1');
  });

  it('returns the bare path for unsafe or empty redirects', () => {
    expect(withRedirect('/login', '//evil.example')).toBe('/login');
    expect(withRedirect('/registration', '')).toBe('/registration');
  });
});
