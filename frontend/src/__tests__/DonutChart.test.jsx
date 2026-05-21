import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DonutChart from '@/components/dashboard/DonutChart'

const defaultProps = { active: 8, idle: 3, offline: 1, total: 12 }

describe('DonutChart', () => {

  test('renders the Fleet Status heading', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('Fleet Status')).toBeInTheDocument()
  })

  test('renders an SVG element', () => {
    const { container } = render(<DonutChart {...defaultProps} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('renders the TOTAL label inside the SVG', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
  })

  // ── Counts displayed ─────────────────────────────────────────────────────

  test('displays the total vehicle count in the donut centre', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  test('displays the active count in the legend', () => {
    render(<DonutChart {...defaultProps} />)
    // There may be multiple elements with "8"; at least one must be present
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
  })

  test('displays the idle count in the legend', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  test('displays the offline count in the legend', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })


  test('renders Active legend label', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('renders Idle legend label', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  test('renders Offline legend label', () => {
    render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })


  test('renders four circles inside the SVG (background + 3 segments)', () => {
    const { container } = render(<DonutChart {...defaultProps} />)
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(4)
  })

  test('active segment uses the green stroke colour', () => {
    const { container } = render(<DonutChart {...defaultProps} />)
    const circles = [...container.querySelectorAll('circle')]
    const greenCircle = circles.find(c => c.getAttribute('stroke') === '#2d6a4f')
    expect(greenCircle).toBeTruthy()
  })

  test('idle segment uses the amber stroke colour', () => {
    const { container } = render(<DonutChart {...defaultProps} />)
    const circles = [...container.querySelectorAll('circle')]
    const amberCircle = circles.find(c => c.getAttribute('stroke') === '#f59e0b')
    expect(amberCircle).toBeTruthy()
  })

  test('offline segment uses the gray stroke colour', () => {
    const { container } = render(<DonutChart {...defaultProps} />)
    const circles = [...container.querySelectorAll('circle')]
    const grayCircle = circles.find(c => c.getAttribute('stroke') === '#9ca3af')
    expect(grayCircle).toBeTruthy()
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('renders without crashing when all counts are zero', () => {
    render(<DonutChart active={0} idle={0} offline={0} total={0} />)
    expect(screen.getByText('Fleet Status')).toBeInTheDocument()
  })

  test('renders without crashing when props are omitted', () => {
    render(<DonutChart />)
    expect(screen.getByText('Fleet Status')).toBeInTheDocument()
  })

  test('displays updated total when props change', () => {
    const { rerender } = render(<DonutChart {...defaultProps} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    rerender(<DonutChart active={10} idle={2} offline={3} total={15} />)
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})