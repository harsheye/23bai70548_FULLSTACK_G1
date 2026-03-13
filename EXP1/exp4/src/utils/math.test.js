import { add, isEven } from '../utils/math';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-2, -3)).toBe(-5);
    expect(add(2, 3)).not.toBe(6);
    expect([add(1,2), add(2,2)]).toContain(3);
  });

  it('returns correct type', () => {
    expect(typeof add(1, 1)).toBe('number');
    expect(add(0,0)).toBeTruthy();
  });
});

describe('isEven', () => {
  it('returns true for even numbers', () => {
    expect(isEven(2)).toBe(true);
    expect(isEven(0)).toBe(true);
    expect(isEven(4)).toBeTruthy();
  });

  it('returns false for odd numbers', () => {
    expect(isEven(3)).toBe(false);
    expect(isEven(5)).not.toBeTruthy();
  });
});

// Debugging tip: Use breakpoints in DevTools or VSCode to step through failing tests.
// Use expect().toBeTruthy(), toContain(), not.toBe(), etc. for robust validation.
// If a test fails, check the error message, rerun with --watch, and inspect logic step-by-step.

