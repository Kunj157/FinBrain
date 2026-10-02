import { describe, it, expect } from 'vitest';
import { parseAmount } from '../routes/import';

// Every one of these is a shape a real bank export produces. The previous
// implementation was `parseFloat(cell) || 0`, which turned most of them into a
// silent zero-value transaction rather than failing.
describe('parseAmount', () => {
  it('reads a plain decimal', () => {
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('-12.50')).toBe(-12.5);
  });

  it('strips currency symbols and spaces', () => {
    expect(parseAmount('$1234.56')).toBe(1234.56);
    expect(parseAmount('€ 99.00')).toBe(99);
    expect(parseAmount(' 42.00 ')).toBe(42);
  });

  it('reads US grouping', () => {
    // parseFloat('$1,234.56') was NaN, so this became 0.
    expect(parseAmount('$1,234.56')).toBe(1234.56);
    expect(parseAmount('1,234,567.89')).toBe(1234567.89);
  });

  it('reads European grouping', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1.234.567,89')).toBe(1234567.89);
  });

  it('disambiguates a lone comma by digit grouping', () => {
    // Three trailing digits is a thousands group; anything else is a decimal.
    expect(parseAmount('1,500')).toBe(1500);
    expect(parseAmount('1,50')).toBe(1.5);
  });

  it('treats accounting parentheses as negative', () => {
    expect(parseAmount('(45.00)')).toBe(-45);
    expect(parseAmount('($1,234.56)')).toBe(-1234.56);
  });

  it('handles a trailing minus', () => {
    expect(parseAmount('45.00-')).toBe(-45);
  });

  it('returns zero for values it cannot read, rather than NaN', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('   ')).toBe(0);
    expect(parseAmount('n/a')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });
});
