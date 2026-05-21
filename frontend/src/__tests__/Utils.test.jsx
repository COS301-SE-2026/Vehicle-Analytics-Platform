import { cn } from '../pages/dashboard/lib/utils'

describe('cn utility', () => {
  test('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('handles conditional classes', () => {
    expect(cn('foo', false && 'bar')).toBe('foo')
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
