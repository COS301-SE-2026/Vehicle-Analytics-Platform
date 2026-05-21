jest.mock('@/lib/utils', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}))

import { render, screen } from '@testing-library/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../components/ui/table'

describe('Table', () => {
  test('renders a table element', () => {
    const { container } = render(<Table />)
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  test('renders with data-slot="table"', () => {
    const { container } = render(<Table />)
    expect(container.querySelector('[data-slot="table"]')).toBeInTheDocument()
  })

  test('wraps table in a container div', () => {
    const { container } = render(<Table />)
    expect(container.querySelector('[data-slot="table-container"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<Table><tbody><tr><td>Cell content</td></tr></tbody></Table>)
    expect(screen.getByText('Cell content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Table className="custom-table" />)
    expect(container.querySelector('.custom-table')).toBeInTheDocument()
  })

  test('passes additional props', () => {
    const { container } = render(<Table aria-label="vehicle table" />)
    expect(container.querySelector('[aria-label="vehicle table"]')).toBeInTheDocument()
  })
})

describe('TableHeader', () => {
  test('renders a thead element', () => {
    const { container } = render(<table><TableHeader /></table>)
    expect(container.querySelector('thead')).toBeInTheDocument()
  })

  test('renders with data-slot="table-header"', () => {
    const { container } = render(<table><TableHeader /></table>)
    expect(container.querySelector('[data-slot="table-header"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><TableHeader><tr><th>Name</th></tr></TableHeader></table>)
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><TableHeader className="header-custom" /></table>)
    expect(container.querySelector('.header-custom')).toBeInTheDocument()
  })
})

describe('TableBody', () => {
  test('renders a tbody element', () => {
    const { container } = render(<table><TableBody /></table>)
    expect(container.querySelector('tbody')).toBeInTheDocument()
  })

  test('renders with data-slot="table-body"', () => {
    const { container } = render(<table><TableBody /></table>)
    expect(container.querySelector('[data-slot="table-body"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><TableBody><tr><td>Row data</td></tr></TableBody></table>)
    expect(screen.getByText('Row data')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><TableBody className="body-custom" /></table>)
    expect(container.querySelector('.body-custom')).toBeInTheDocument()
  })
})

describe('TableFooter', () => {
  test('renders a tfoot element', () => {
    const { container } = render(<table><TableFooter /></table>)
    expect(container.querySelector('tfoot')).toBeInTheDocument()
  })

  test('renders with data-slot="table-footer"', () => {
    const { container } = render(<table><TableFooter /></table>)
    expect(container.querySelector('[data-slot="table-footer"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><TableFooter><tr><td>Footer data</td></tr></TableFooter></table>)
    expect(screen.getByText('Footer data')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><TableFooter className="footer-custom" /></table>)
    expect(container.querySelector('.footer-custom')).toBeInTheDocument()
  })
})

describe('TableRow', () => {
  test('renders a tr element', () => {
    const { container } = render(<table><tbody><TableRow /></tbody></table>)
    expect(container.querySelector('tr')).toBeInTheDocument()
  })

  test('renders with data-slot="table-row"', () => {
    const { container } = render(<table><tbody><TableRow /></tbody></table>)
    expect(container.querySelector('[data-slot="table-row"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><tbody><TableRow><td>Row content</td></TableRow></tbody></table>)
    expect(screen.getByText('Row content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><tbody><TableRow className="row-custom" /></tbody></table>)
    expect(container.querySelector('.row-custom')).toBeInTheDocument()
  })
})

describe('TableHead', () => {
  test('renders a th element', () => {
    const { container } = render(<table><thead><tr><TableHead /></tr></thead></table>)
    expect(container.querySelector('th')).toBeInTheDocument()
  })

  test('renders with data-slot="table-head"', () => {
    const { container } = render(<table><thead><tr><TableHead /></tr></thead></table>)
    expect(container.querySelector('[data-slot="table-head"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><thead><tr><TableHead>Status</TableHead></tr></thead></table>)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><thead><tr><TableHead className="head-custom" /></tr></thead></table>)
    expect(container.querySelector('.head-custom')).toBeInTheDocument()
  })
})

describe('TableCell', () => {
  test('renders a td element', () => {
    const { container } = render(<table><tbody><tr><TableCell /></tr></tbody></table>)
    expect(container.querySelector('td')).toBeInTheDocument()
  })

  test('renders with data-slot="table-cell"', () => {
    const { container } = render(<table><tbody><tr><TableCell /></tr></tbody></table>)
    expect(container.querySelector('[data-slot="table-cell"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><tbody><tr><TableCell>Vehicle 001</TableCell></tr></tbody></table>)
    expect(screen.getByText('Vehicle 001')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><tbody><tr><TableCell className="cell-custom" /></tr></tbody></table>)
    expect(container.querySelector('.cell-custom')).toBeInTheDocument()
  })
})

describe('TableCaption', () => {
  test('renders a caption element', () => {
    const { container } = render(<table><TableCaption /></table>)
    expect(container.querySelector('caption')).toBeInTheDocument()
  })

  test('renders with data-slot="table-caption"', () => {
    const { container } = render(<table><TableCaption /></table>)
    expect(container.querySelector('[data-slot="table-caption"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<table><TableCaption>Fleet vehicle list</TableCaption></table>)
    expect(screen.getByText('Fleet vehicle list')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<table><TableCaption className="caption-custom" /></table>)
    expect(container.querySelector('.caption-custom')).toBeInTheDocument()
  })
})

describe('Table composition', () => {
  test('renders a fully composed table', () => {
    render(
      <Table>
        <TableCaption>Vehicle Fleet Status</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>V-001</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Johannesburg</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>V-002</TableCell>
            <TableCell>Idle</TableCell>
            <TableCell>Pretoria</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total: 2 vehicles</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('Vehicle Fleet Status')).toBeInTheDocument()
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('V-001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Johannesburg')).toBeInTheDocument()
    expect(screen.getByText('V-002')).toBeInTheDocument()
    expect(screen.getByText('Total: 2 vehicles')).toBeInTheDocument()
  })
})