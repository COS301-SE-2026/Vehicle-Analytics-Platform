import { render, screen,} from '@testing-library/react'
import '@testing-library/jest-dom'
import SafetyScoreRing from '@/components/vehicles/SafetyScoreRing'
import { getScoreSeverity } from '@/utils/safetyScore'

jest.mock('@/utils/safetyScore', () => ({
  getScoreSeverity: jest.fn(),
}))

const baseSeverity = {
  ringColour: '#22C55E',
  bgClass: 'bg-green-50',
  textClass: 'text-fleet-green',
  label: 'Good',
}

describe('SafetyScoreRing', () => {
  beforeEach(() => {
    getScoreSeverity.mockReturnValue(baseSeverity)
  })

  test('renders the numeric score', () => {
    render(<SafetyScoreRing score={82} />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  test('renders "-" when score is null', () => {
    render(<SafetyScoreRing score={null} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('calls getScoreSeverity with the given score', () => {
    render(<SafetyScoreRing score={55} />)
    expect(getScoreSeverity).toHaveBeenCalledWith(55)
  })

  test('renders the severity label by default', () => {
    render(<SafetyScoreRing score={82} />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  test('hides the severity label when showLabel is false', () => {
    render(<SafetyScoreRing score={82} showLabel={false} />)
    expect(screen.queryByText('Good')).not.toBeInTheDocument()
  })


  test('applies the severity colour to the progress stroke', () => {
    render(<SafetyScoreRing score={82} />)
    const progressCircle = screen.getByTestId('progress-ring')
    const baseRing = screen.getByTestId('background-ring')
    expect(progressCircle).toHaveAttribute('stroke', '#22C55E')
    expect(baseRing).toHaveAttribute('stroke', '#22C55E')
    expect(baseRing).toHaveAttribute('stroke-opacity', '0.18')
  })

  test('applies transparent background class to center fill', () => { render(<SafetyScoreRing score={82} />)
    expect(screen.getByTestId('score-fill')).toHaveClass('bg-transparent')
  })

  test('uses default size and strokeWidth to compute the svg and radius', () => {
    const { container } = render(<SafetyScoreRing score={82} />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '36')
    expect(svg).toHaveAttribute('height', '36')

    const backgroundCircle = screen.getByTestId('background-ring')
    expect(backgroundCircle).toHaveAttribute('r', '16.5')
  })

  test('does proper custom size and strokeWidth props', () => {
    const { container } = render(<SafetyScoreRing score={82} size={60} strokeWidth={6} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '60')
    expect(svg).toHaveAttribute('height', '60')

    const backgroundCircle = screen.getByTestId('background-ring')
    expect(backgroundCircle).toHaveAttribute('r', '27')
  })

  test('sets a zero fill stroke when score is null', () => {
    render(<SafetyScoreRing score={null} />)
    const progressCircle = screen.getByTestId('progress-ring')
    const circumference = 2 * Math.PI * 16.5
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', String(circumference))
  })

  test('sets a zero stroke dash when score 100', () => {
    render(<SafetyScoreRing score={100} />)
    const progressCircle = screen.getByTestId('progress-ring')
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', '0')
  })
})