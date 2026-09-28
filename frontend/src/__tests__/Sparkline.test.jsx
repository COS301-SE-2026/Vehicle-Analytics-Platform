import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import Sparkline from '@/components/risk/Sparkline'

describe('Sparkline', () => {
  describe('empty state', () => {
    test('renders "no history" when data is empty', () => {
      render(<Sparkline data={[]} tier="low" />)
      expect(screen.getByText('no history')).toBeInTheDocument()
    })

    test('renders "no history" when data is not provided', () => {
      render(<Sparkline tier="low" />)
      expect(screen.getByText('no history')).toBeInTheDocument()
    })

    test('does not render an SVG when there is no data', () => {
      const { container } = render(<Sparkline data={[]} tier="low" />)
      expect(container.querySelector('svg')).not.toBeInTheDocument()
    })
  })

  describe('rendering with data', () => {
    const sampleData = [
      { date: '2026-09-20', score: 40 },
      { date: '2026-09-21', score: 55 },
      { date: '2026-09-22', score: 70 },
      { date: '2026-09-23', score: 60 },
      { date: '2026-09-24', score: 85 },
    ]

    test('renders an SVG', () => {
      const { container } = render(<Sparkline data={sampleData} tier="critical" />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    test('renders exactly one polyline', () => {
      const { container } = render(<Sparkline data={sampleData} tier="critical" />)
      expect(container.querySelectorAll('polyline')).toHaveLength(1)
    })

    test('the polyline has the correct number of points', () => {
      const { container } = render(<Sparkline data={sampleData} tier="critical" />)
      const polyline = container.querySelector('polyline')
      const points = polyline.getAttribute('points').trim().split(/\s+/)
      expect(points).toHaveLength(sampleData.length)
    })

    test('uses the tier colour for the polyline stroke', () => {
      const { container } = render(<Sparkline data={sampleData} tier="critical" />)
      const polyline = container.querySelector('polyline')
      // RiskBadge tier colours are hex strings
      expect(polyline.getAttribute('stroke')).toBe('#e11d48')
    })

    test.each([
      ['critical', '#e11d48'],
      ['high',     '#f97316'],
      ['medium',   '#f59e0b'],
      ['low',      '#10b981'],
    ])('tier "%s" uses stroke colour %s', (tier, expectedStroke) => {
      const { container } = render(<Sparkline data={sampleData} tier={tier} />)
      expect(container.querySelector('polyline').getAttribute('stroke')).toBe(expectedStroke)
    })

    test('falls back to the low colour for an unknown tier', () => {
      const { container } = render(<Sparkline data={sampleData} tier="unknown" />)
      expect(container.querySelector('polyline').getAttribute('stroke')).toBe('#10b981')
    })

    test('respects the width and height props', () => {
      const { container } = render(
        <Sparkline data={sampleData} tier="low" width={100} height={30} />
      )
      const svg = container.querySelector('svg')
      expect(svg.getAttribute('width')).toBe('100')
      expect(svg.getAttribute('height')).toBe('30')
    })

    test('uses default width and height when not provided', () => {
      const { container } = render(<Sparkline data={sampleData} tier="low" />)
      const svg = container.querySelector('svg')
      expect(svg.getAttribute('width')).toBe('80')
      expect(svg.getAttribute('height')).toBe('24')
    })

    test('handles a single data point without producing NaN', () => {
      const { container } = render(
        <Sparkline data={[{ date: '2026-09-24', score: 50 }]} tier="low" />
      )
      const polyline = container.querySelector('polyline')
      const points = polyline.getAttribute('points')
      expect(points).not.toContain('NaN')
    })

    test('handles null score values gracefully (coerces to 0)', () => {
      const { container } = render(
        <Sparkline data={[{ date: '2026-09-23', score: null }, { date: '2026-09-24', score: 80 }]} tier="low" />
      )
      const polyline = container.querySelector('polyline')
      expect(polyline.getAttribute('points')).not.toContain('NaN')
    })

    test('all-flat data produces a valid polyline (no NaN)', () => {
      const flatData = [
        { date: '2026-09-22', score: 50 },
        { date: '2026-09-23', score: 50 },
        { date: '2026-09-24', score: 50 },
      ]
      const { container } = render(<Sparkline data={flatData} tier="medium" />)
      const polyline = container.querySelector('polyline')
      expect(polyline.getAttribute('points')).not.toContain('NaN')
    })

    test('uses all points across the full width when many data points exist', () => {
      const manyPoints = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-09-${String(i + 1).padStart(2, '0')}`,
        score: 40 + (i % 10) * 5,
      }))
      const { container } = render(<Sparkline data={manyPoints} tier="high" width={80} />)
      const polyline = container.querySelector('polyline')
      const points = polyline.getAttribute('points').trim().split(/\s+/)
      expect(points).toHaveLength(30)
    })
  })
})

