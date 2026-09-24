import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import RiskBadge from '@/components/risk/RiskBadge'

describe('RiskBadge', () => {
  describe('rendering per tier', () => {
    test.each([
      ['low', 'Low'],
      ['medium', 'Medium'],
      ['high', 'High'],
      ['critical', 'Critical'],
    ])('renders the label for tier "%s"', (tier, label) => {
      render(<RiskBadge tier={tier} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })

    test('exposes a per-tier data-testid', () => {
      render(<RiskBadge tier="critical" />)
      expect(screen.getByTestId('risk-badge-critical')).toBeInTheDocument()
    })

    test('uses a distinct data-testid for each tier', () => {
      const { rerender } = render(<RiskBadge tier="low" />)
      expect(screen.getByTestId('risk-badge-low')).toBeInTheDocument()

      rerender(<RiskBadge tier="high" />)
      expect(screen.getByTestId('risk-badge-high')).toBeInTheDocument()
    })
  })

  describe('score display', () => {
    test('shows the score when provided', () => {
      render(<RiskBadge tier="critical" score={87} />)
      expect(screen.getByText('87 · Critical')).toBeInTheDocument()
    })

    test('rounds a decimal score to the nearest integer', () => {
      render(<RiskBadge tier="high" score={72.6} />)
      expect(screen.getByText('73 · High')).toBeInTheDocument()
    })

    test('shows only the label when score is omitted', () => {
      render(<RiskBadge tier="low" />)
      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.queryByText(/·/)).not.toBeInTheDocument()
    })

    test('treats score 0 as a valid score (not falsy)', () => {
      render(<RiskBadge tier="low" score={0} />)
      expect(screen.getByText('0 · Low')).toBeInTheDocument()
    })

    test('handles a missing tier by falling back to low', () => {
      render(<RiskBadge score={10} />)
      expect(screen.getByTestId('risk-badge-low')).toBeInTheDocument()
      expect(screen.getByText('10 · Low')).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    test('applies small size styles by default', () => {
      render(<RiskBadge tier="low" />)
      const badge = screen.getByTestId('risk-badge-low')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-0.5')
      expect(badge).toHaveClass('text-xs')
    })

    test('applies medium size styles when size is "md"', () => {
      render(<RiskBadge tier="low" size="md" />)
      const badge = screen.getByTestId('risk-badge-low')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('py-1')
      expect(badge).toHaveClass('text-sm')
    })
  })

  describe('colour styling per tier', () => {
    test.each([
      ['low', 'bg-emerald-50'],
      ['medium', 'bg-amber-50'],
      ['high', 'bg-orange-50'],
      ['critical', 'bg-rose-50'],
    ])('tier "%s" carries the background class %s', (tier, bgClass) => {
      render(<RiskBadge tier={tier} />)
      expect(screen.getByTestId(`risk-badge-${tier}`)).toHaveClass(bgClass)
    })

    test.each([
      ['low', 'text-emerald-700'],
      ['medium', 'text-amber-700'],
      ['high', 'text-orange-700'],
      ['critical', 'text-rose-700'],
    ])('tier "%s" carries the text class %s', (tier, textClass) => {
      render(<RiskBadge tier={tier} />)
      expect(screen.getByTestId(`risk-badge-${tier}`)).toHaveClass(textClass)
    })
  })
})
