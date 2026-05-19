import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table"

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

// ─── Table ───────────────────────────────────────────────────────────────────

describe("Table", () => {
  it("renders a table element with data-slot='table'", () => {
    const { container } = render(<Table />)
    expect(container.querySelector("table[data-slot='table']")).toBeInTheDocument()
  })

  it("wraps the table in a container div", () => {
    const { container } = render(<Table />)
    expect(container.querySelector("[data-slot='table-container']")).toBeInTheDocument()
  })

  it("applies custom className to the table element", () => {
    const { container } = render(<Table className="table-custom" />)
    expect(container.querySelector("table[data-slot='table']").className).toContain("table-custom")
  })

  it("renders children inside the table", () => {
    const { container } = render(
      <Table>
        <tbody><tr><td>Cell</td></tr></tbody>
      </Table>
    )
    expect(screen.getByText("Cell")).toBeInTheDocument()
  })

  it("passes additional props to the table element", () => {
    const { container } = render(<Table aria-label="data table" />)
    expect(container.querySelector("table")).toHaveAttribute("aria-label", "data table")
  })
})

// ─── TableHeader ─────────────────────────────────────────────────────────────

describe("TableHeader", () => {
  it("renders a thead with data-slot='table-header'", () => {
    const { container } = render(<table><TableHeader /></table>)
    expect(container.querySelector("thead[data-slot='table-header']")).toBeInTheDocument()
  })

  it("renders children", () => {
    const { container } = render(
      <table><TableHeader><tr><th>Name</th></tr></TableHeader></table>
    )
    expect(screen.getByText("Name")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><TableHeader className="header-custom" /></table>)
    expect(container.querySelector("thead").className).toContain("header-custom")
  })
})

// ─── TableBody ───────────────────────────────────────────────────────────────

describe("TableBody", () => {
  it("renders a tbody with data-slot='table-body'", () => {
    const { container } = render(<table><TableBody /></table>)
    expect(container.querySelector("tbody[data-slot='table-body']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(
      <table><TableBody><tr><td>Row data</td></tr></TableBody></table>
    )
    expect(screen.getByText("Row data")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><TableBody className="body-custom" /></table>)
    expect(container.querySelector("tbody").className).toContain("body-custom")
  })
})

// ─── TableFooter ─────────────────────────────────────────────────────────────

describe("TableFooter", () => {
  it("renders a tfoot with data-slot='table-footer'", () => {
    const { container } = render(<table><TableFooter /></table>)
    expect(container.querySelector("tfoot[data-slot='table-footer']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(
      <table><TableFooter><tr><td>Total: 10</td></tr></TableFooter></table>
    )
    expect(screen.getByText("Total: 10")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><TableFooter className="footer-custom" /></table>)
    expect(container.querySelector("tfoot").className).toContain("footer-custom")
  })
})

// ─── TableRow ────────────────────────────────────────────────────────────────

describe("TableRow", () => {
  it("renders a tr with data-slot='table-row'", () => {
    const { container } = render(<table><tbody><TableRow /></tbody></table>)
    expect(container.querySelector("tr[data-slot='table-row']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<table><tbody><TableRow><td>Row cell</td></TableRow></tbody></table>)
    expect(screen.getByText("Row cell")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><tbody><TableRow className="row-custom" /></tbody></table>)
    expect(container.querySelector("tr").className).toContain("row-custom")
  })

  it("applies data-state for selected rows", () => {
    const { container } = render(
      <table><tbody><TableRow data-state="selected" /></tbody></table>
    )
    expect(container.querySelector("tr")).toHaveAttribute("data-state", "selected")
  })
})

// ─── TableHead ───────────────────────────────────────────────────────────────

describe("TableHead", () => {
  it("renders a th with data-slot='table-head'", () => {
    const { container } = render(<table><thead><tr><TableHead /></tr></thead></table>)
    expect(container.querySelector("th[data-slot='table-head']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<table><thead><tr><TableHead>Vehicle ID</TableHead></tr></thead></table>)
    expect(screen.getByText("Vehicle ID")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><thead><tr><TableHead className="head-custom" /></tr></thead></table>)
    expect(container.querySelector("th").className).toContain("head-custom")
  })

  it("passes scope and other props", () => {
    const { container } = render(<table><thead><tr><TableHead scope="col">Col</TableHead></tr></thead></table>)
    expect(container.querySelector("th")).toHaveAttribute("scope", "col")
  })
})

// ─── TableCell ───────────────────────────────────────────────────────────────

describe("TableCell", () => {
  it("renders a td with data-slot='table-cell'", () => {
    const { container } = render(<table><tbody><tr><TableCell /></tr></tbody></table>)
    expect(container.querySelector("td[data-slot='table-cell']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<table><tbody><tr><TableCell>TRK-001</TableCell></tr></tbody></table>)
    expect(screen.getByText("TRK-001")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><tbody><tr><TableCell className="cell-custom" /></tr></tbody></table>)
    expect(container.querySelector("td").className).toContain("cell-custom")
  })

  it("passes colSpan prop", () => {
    const { container } = render(<table><tbody><tr><TableCell colSpan={3}>spanning</TableCell></tr></tbody></table>)
    expect(container.querySelector("td")).toHaveAttribute("colSpan", "3")
  })
})

// ─── TableCaption ─────────────────────────────────────────────────────────────

describe("TableCaption", () => {
  it("renders a caption with data-slot='table-caption'", () => {
    const { container } = render(<table><TableCaption>Fleet data</TableCaption></table>)
    expect(container.querySelector("caption[data-slot='table-caption']")).toBeInTheDocument()
  })

  it("renders caption text", () => {
    render(<table><TableCaption>A list of active vehicles.</TableCaption></table>)
    expect(screen.getByText("A list of active vehicles.")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<table><TableCaption className="caption-custom">Caption</TableCaption></table>)
    expect(container.querySelector("caption").className).toContain("caption-custom")
  })
})

// ─── Full Table Composition ──────────────────────────────────────────────────

describe("Table composition", () => {
  it("renders a complete table with all subcomponents", () => {
    render(
      <Table aria-label="vehicles">
        <TableCaption>Active fleet vehicles</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>TRK-001</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>John Doe</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>TRK-002</TableCell>
            <TableCell>Idle</TableCell>
            <TableCell>Jane Smith</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total: 2 vehicles</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText("Active fleet vehicles")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Driver")).toBeInTheDocument()
    expect(screen.getByText("TRK-001")).toBeInTheDocument()
    expect(screen.getByText("TRK-002")).toBeInTheDocument()
    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("Jane Smith")).toBeInTheDocument()
    expect(screen.getByText("Total: 2 vehicles")).toBeInTheDocument()
  })
})