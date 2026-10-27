import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import RiskFeatureTable from '@/components/risk/RiskFeatureTable'

describe('RiskFeatureTable', () => {
  const sampleFeatures = {
    safety: 32.26,
    harsh: 47.19,
    speeding: 1.0,
    weekend: 0.24,
    distance: 789.95,
    recency: 12.0,
  }

  describe('empty state', () => {
    test('renders an empty state when features is empty', () => {
      render(<RiskFeatureTable features={{}} />)
      expect(screen.getByText(/No feature breakdown available/i)).toBeInTheDocument()
    })

    test('renders an empty state when features is missing', () => {
      render(<RiskFeatureTable />)
      expect(screen.getByText(/No feature breakdown available/i)).toBeInTheDocument()
    })
  })

  describe('feature rows', () => {
    test('renders a row for every known feature', () => {
      render(<RiskFeatureTable features={sampleFeatures} />)

      expect(screen.getByText('Avg safety score (30d)')).toBeInTheDocument()
      expect(screen.getByText('Harsh events per trip')).toBeInTheDocument()
      expect(screen.getByText('Speeding ratio')).toBeInTheDocument()
      expect(screen.getByText('Weekend trip ratio')).toBeInTheDocument()
      expect(screen.getByText('Distance (30d, km)')).toBeInTheDocument()
      expect(screen.getByText('Days since last trip')).toBeInTheDocument()
    })

    test('renders all values with 2 decimal places', () => {
      render(<RiskFeatureTable features={sampleFeatures} />)

      expect(screen.getByText('32.26')).toBeInTheDocument()
      expect(screen.getByText('47.19')).toBeInTheDocument()
      expect(screen.getByText('1.00')).toBeInTheDocument()
      expect(screen.getByText('0.24')).toBeInTheDocument()
      expect(screen.getByText('789.95')).toBeInTheDocument()
      expect(screen.getByText('12.00')).toBeInTheDocument()
    })

    test('renders only Feature and Value column headings', () => {
      render(<RiskFeatureTable features={sampleFeatures} />)

      expect(screen.getByText('Feature')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
      
      // The Contribution column should NOT exist anymore
      expect(screen.queryByText('Contribution')).not.toBeInTheDocument()
    })

    test('does not show "not in top 3" labels anymore', () => {
      render(<RiskFeatureTable features={sampleFeatures} />)
      const notInTop3 = screen.queryAllByText(/not in top 3/i)
      expect(notInTop3).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    test('shows "—" when a value is null', () => {
      render(<RiskFeatureTable features={{ ...sampleFeatures, harsh: null }} />)
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })

    test('shows "—" when a value is missing', () => {
      render(
        <RiskFeatureTable
          features={{ safety: 50, harsh: 5, speeding: 0.5 }}
        />
      )
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBe(3) // weekend, distance, recency are missing
    })

    test('shows "—" when a value is non-numeric', () => {
      render(
        <RiskFeatureTable
          features={{ ...sampleFeatures, safety: 'invalid' }}
        />
      )
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBe(1) // only safety is invalid
    })
  })
})
