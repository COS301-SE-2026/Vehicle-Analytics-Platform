import { render } from '@testing-library/react'
import LiveFleetMapPlaceholder from '../components/dashboard/LiveFleetMapPlaceholder'

describe('LiveFleetMapPlaceholder', () => {
  test('renders without crashing', () => {
    const { container } = render(<LiveFleetMapPlaceholder />)
    expect(container).toBeDefined()
  })
})
