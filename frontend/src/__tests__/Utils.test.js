import { cn } from '../pages/dashboard/lib/utils'

describe('cn utility', () => {
  test('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('handles conditional classes', () => {
    // resulting booleans directly instead of using a constant && expression
    expect(cn('foo', false, true && 'baz')).toBe('foo baz')
  })

  test('deduplicates tailwind classes', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })

  test('handles empty input', () => {
    expect(cn()).toBe('')
  })

  test('handles undefined and null', () => {
    expect(cn('foo', undefined, null)).toBe('foo')
  })
})