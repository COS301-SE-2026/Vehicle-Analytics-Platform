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

  const sampleTopFactors = [
    { name: 'Distance (30d, km)', weight: 7.9, value: 789.95 },
    { name: 'Avg safety score (30d)', weight: 0.73, value: 32.26 },
    { name: 'Speeding ratio', weight: 0.73, value: 1.0 },
  ]

  describe('empty state', () => {
    test('renders an empty state when features is empty', () => {
      render(<RiskFeatureTable features={{}} topFactors={[]} />)
      expect(screen.getByText(/No feature breakdown available/i)).toBeInTheDocument()
    })

    test('renders an empty state when features is missing', () => {
      render(<RiskFeatureTable topFactors={[]} />)
      expect(screen.getByText(/No feature breakdown available/i)).toBeInTheDocument()
    })
  })

  describe('feature rows', () => {
    test('renders a row for every known feature', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />)

      expect(screen.getByText('Avg safety score (30d)')).toBeInTheDocument()
      expect(screen.getByText('Harsh events per trip')).toBeInTheDocument()
      expect(screen.getByText('Speeding ratio')).toBeInTheDocument()
      expect(screen.getByText('Weekend trip ratio')).toBeInTheDocument()
      expect(screen.getByText('Distance (30d, km)')).toBeInTheDocument()
      expect(screen.getByText('Days since last trip')).toBeInTheDocument()
    })

    test('renders all values with 2 decimal places', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />)

      expect(screen.getByText('32.26')).toBeInTheDocument()   // safety
      expect(screen.getByText('47.19')).toBeInTheDocument()   // harsh
      expect(screen.getByText('1.00')).toBeInTheDocument()    // speeding
      expect(screen.getByText('0.24')).toBeInTheDocument()    // weekend
      expect(screen.getByText('789.95')).toBeInTheDocument()  // distance
      expect(screen.getByText('12.00')).toBeInTheDocument()   // recency
    })

    test('renders the feature and contribution column headings', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />)

      expect(screen.getByText('Feature')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
      expect(screen.getByText('Contribution')).toBeInTheDocument()
    })
  })

  describe('top-3 highlighting', () => {
    test('shows the contribution weight for top-3 factors', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />)

      

      expect(screen.getByText('7.90')).toBeInTheDocument()
     
      
      const contributions = screen.getAllByText('0.73')
      expect(contributions.length).toBe(2)
    })

    test('marks features not in the top 3 with the "not in top 3" label', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />)

   
      
      const notInTop3 = screen.getAllByText(/not in top 3/i)
      expect(notInTop3).toHaveLength(3)
    })

    test('renders only contribution bars for top-3 factors', () => {
      const { container } = render(
        <RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />
      )

      
      const bars = container.querySelectorAll('div[style*="linear-gradient"]')
      expect(bars).toHaveLength(3)
    })

    test('does not render a bar for a feature outside the top 3', () => {
      const { container } = render(
        <RiskFeatureTable features={sampleFeatures} topFactors={sampleTopFactors} />
      )

      const rows = container.querySelectorAll('tbody tr')
      rows.forEach((row) => {
        const label = row.querySelector('td')?.textContent || ''
        const hasBar = row.querySelector('div[style*="linear-gradient"]') !== null
        if (label.includes('Harsh events per trip') ||
            label.includes('Weekend trip ratio') ||
            label.includes('Days since last trip')) {
          expect(hasBar).toBe(false)
        }
      })
    })
  })

  describe('edge cases', () => {
    test('handles numeric values that are null (renders a dash, not 0.00)', () => {
      render(
        <RiskFeatureTable
          features={{ ...sampleFeatures, harsh: null }}
          topFactors={sampleTopFactors}
        />
      )
    
      
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })

    test('shows "—" when a value is missing or non-numeric', () => {
      render(
        <RiskFeatureTable
          features={{ safety: 50, harsh: 5, speeding: 0.5 }}
          topFactors={[]}
        />
      )
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })

    test('handles empty top_factors (all features marked not in top 3)', () => {
      render(<RiskFeatureTable features={sampleFeatures} topFactors={[]} />)
      const notInTop3 = screen.getAllByText(/not in top 3/i)
      expect(notInTop3).toHaveLength(6)
    })

    test('caps the top-3 bar width at 100%', () => {
      const extremeFactors = [
        { name: 'Distance (30d, km)', weight: 9999, value: 5000 },
      ]
      const { container } = render(
        <RiskFeatureTable features={sampleFeatures} topFactors={extremeFactors} />
      )
      const bar = container.querySelector('div[style*="linear-gradient"]')
      const style = bar.getAttribute('style') || ''
    
      
      expect(style).not.toMatch(/width:\s*[2-9]\d\d/)
    })
  })
})
