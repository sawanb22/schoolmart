import { describe, it, expect } from 'vitest';
import { parsePageData } from '../../src/lib/page-data';

describe('parsePageData', () => {
    it('returns a plain object as is', () => {
        const input = { heroTitle: 'Test Title', cards: [{ title: 'Card 1' }] };
        const result = parsePageData(input);
        expect(result).toEqual(input);
    });

    it('parses a valid JSON string into a plain object', () => {
        const input = JSON.stringify({ heroTitle: 'String Title', count: 42 });
        const result = parsePageData(input);
        expect(result).toEqual({ heroTitle: 'String Title', count: 42 });
    });

    it('safely handles double-encoded JSON strings', () => {
        const inner = JSON.stringify({ heroTitle: 'Double Encoded', active: true });
        const doubleEncoded = JSON.stringify(inner);
        const result = parsePageData(doubleEncoded);
        expect(result).toEqual({ heroTitle: 'Double Encoded', active: true });
    });

    it('returns empty object for null', () => {
        expect(parsePageData(null)).toEqual({});
    });

    it('returns empty object for undefined', () => {
        expect(parsePageData(undefined)).toEqual({});
    });

    it('returns empty object for empty or whitespace string', () => {
        expect(parsePageData('')).toEqual({});
        expect(parsePageData('   ')).toEqual({});
        expect(parsePageData('\n\t')).toEqual({});
    });

    it('returns empty object for invalid JSON string', () => {
        expect(parsePageData('{invalid: json')).toEqual({});
        expect(parsePageData('not a json object')).toEqual({});
    });

    it('returns empty object for JSON strings encoding primitives', () => {
        expect(parsePageData('123')).toEqual({});
        expect(parsePageData('"a string"')).toEqual({});
        expect(parsePageData('true')).toEqual({});
        expect(parsePageData('null')).toEqual({});
    });

    it('returns empty object for arrays and JSON arrays', () => {
        expect(parsePageData([1, 2, 3])).toEqual({});
        expect(parsePageData('["item1", "item2"]')).toEqual({});
    });

    it('returns empty object for primitive numbers and booleans', () => {
        expect(parsePageData(123)).toEqual({});
        expect(parsePageData(true)).toEqual({});
        expect(parsePageData(false)).toEqual({});
    });
});
