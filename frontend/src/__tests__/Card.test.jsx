jest.mock('@/lib/utils', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}))

import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '../components/ui/card'

describe('Card', () => {
  test('renders as a div', () => {
    const { container } = render(<Card />)
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  test('renders with default size', () => {
    render(<Card />)
    expect(document.querySelector('[data-size="default"]')).toBeInTheDocument()
  })

  test('renders with custom size', () => {
    render(<Card size="sm" />)
    expect(document.querySelector('[data-size="sm"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<Card><span>Card content</span></Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<Card className="custom-card" />)
    expect(document.querySelector('.custom-card')).toBeInTheDocument()
  })

  test('passes additional props', () => {
    render(<Card aria-label="info card" />)
    expect(document.querySelector('[aria-label="info card"]')).toBeInTheDocument()
  })
})

describe('CardHeader', () => {
  test('renders children', () => {
    render(<CardHeader><span>Header child</span></CardHeader>)
    expect(screen.getByText('Header child')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardHeader className="header-custom" />)
    expect(document.querySelector('.header-custom')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  test('renders title text', () => {
    render(<CardTitle>Fleet Overview</CardTitle>)
    expect(screen.getByText('Fleet Overview')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardTitle className="title-custom">Title</CardTitle>)
    expect(document.querySelector('.title-custom')).toBeInTheDocument()
  })
})

describe('CardDescription', () => {
  test('renders description text', () => {
    render(<CardDescription>A summary of fleet activity</CardDescription>)
    expect(screen.getByText('A summary of fleet activity')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardDescription className="desc-custom">Text</CardDescription>)
    expect(document.querySelector('.desc-custom')).toBeInTheDocument()
  })
})

describe('CardAction', () => {
  test('renders children', () => {
    render(<CardAction><button>Edit</button></CardAction>)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardAction className="action-custom" />)
    expect(document.querySelector('.action-custom')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  test('renders children', () => {
    render(<CardContent><p>Content body</p></CardContent>)
    expect(screen.getByText('Content body')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardContent className="content-custom" />)
    expect(document.querySelector('.content-custom')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  test('renders children', () => {
    render(<CardFooter><span>Footer text</span></CardFooter>)
    expect(screen.getByText('Footer text')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<CardFooter className="footer-custom" />)
    expect(document.querySelector('.footer-custom')).toBeInTheDocument()
  })
})

describe('Card composition', () => {
  test('renders a fully composed card', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Active Vehicles</CardTitle>
          <CardDescription>Live fleet status</CardDescription>
          <CardAction><button>View All</button></CardAction>
        </CardHeader>
        <CardContent><p>24 vehicles online</p></CardContent>
        <CardFooter><span>Last updated: now</span></CardFooter>
      </Card>
    )

    expect(screen.getByText('Active Vehicles')).toBeInTheDocument()
    expect(screen.getByText('Live fleet status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument()
    expect(screen.getByText('24 vehicles online')).toBeInTheDocument()
    expect(screen.getByText('Last updated: now')).toBeInTheDocument()
  })
})