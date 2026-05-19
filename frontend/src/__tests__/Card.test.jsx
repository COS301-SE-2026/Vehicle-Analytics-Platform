import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "./card"

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

describe("Card", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<Card />)
    expect(container.querySelector("[data-slot='card']")).toBeInTheDocument()
  })

  it("renders as a div", () => {
    const { container } = render(<Card />)
    expect(container.querySelector("div[data-slot='card']")).toBeInTheDocument()
  })

  it("renders with default size", () => {
    const { container } = render(<Card />)
    expect(container.querySelector("[data-slot='card']")).toHaveAttribute("data-size", "default")
  })

  it("renders with custom size", () => {
    const { container } = render(<Card size="sm" />)
    expect(container.querySelector("[data-slot='card']")).toHaveAttribute("data-size", "sm")
  })

  it("applies custom className", () => {
    const { container } = render(<Card className="custom-card" />)
    expect(container.querySelector("[data-slot='card']").className).toContain("custom-card")
  })

  it("renders children", () => {
    render(<Card><span>Card content</span></Card>)
    expect(screen.getByText("Card content")).toBeInTheDocument()
  })

  it("passes additional props", () => {
    const { container } = render(<Card aria-label="info card" />)
    expect(container.querySelector("[data-slot='card']")).toHaveAttribute("aria-label", "info card")
  })
})

describe("CardHeader", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardHeader />)
    expect(container.querySelector("[data-slot='card-header']")).toBeInTheDocument()
  })

  it("renders as a div", () => {
    const { container } = render(<CardHeader />)
    expect(container.querySelector("div[data-slot='card-header']")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardHeader className="header-custom" />)
    expect(container.querySelector("[data-slot='card-header']").className).toContain("header-custom")
  })

  it("renders children", () => {
    render(<CardHeader><span>Header child</span></CardHeader>)
    expect(screen.getByText("Header child")).toBeInTheDocument()
  })
})

describe("CardTitle", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardTitle>My Title</CardTitle>)
    expect(container.querySelector("[data-slot='card-title']")).toBeInTheDocument()
  })

  it("renders title text", () => {
    render(<CardTitle>Fleet Overview</CardTitle>)
    expect(screen.getByText("Fleet Overview")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardTitle className="title-custom">Title</CardTitle>)
    expect(container.querySelector("[data-slot='card-title']").className).toContain("title-custom")
  })
})

describe("CardDescription", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardDescription>Desc</CardDescription>)
    expect(container.querySelector("[data-slot='card-description']")).toBeInTheDocument()
  })

  it("renders description text", () => {
    render(<CardDescription>A summary of fleet activity</CardDescription>)
    expect(screen.getByText("A summary of fleet activity")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardDescription className="desc-custom">Text</CardDescription>)
    expect(container.querySelector("[data-slot='card-description']").className).toContain("desc-custom")
  })
})

describe("CardAction", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardAction />)
    expect(container.querySelector("[data-slot='card-action']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<CardAction><button>Edit</button></CardAction>)
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardAction className="action-custom" />)
    expect(container.querySelector("[data-slot='card-action']").className).toContain("action-custom")
  })
})

describe("CardContent", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardContent />)
    expect(container.querySelector("[data-slot='card-content']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<CardContent><p>Content body</p></CardContent>)
    expect(screen.getByText("Content body")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardContent className="content-custom" />)
    expect(container.querySelector("[data-slot='card-content']").className).toContain("content-custom")
  })
})

describe("CardFooter", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<CardFooter />)
    expect(container.querySelector("[data-slot='card-footer']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<CardFooter><span>Footer text</span></CardFooter>)
    expect(screen.getByText("Footer text")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<CardFooter className="footer-custom" />)
    expect(container.querySelector("[data-slot='card-footer']").className).toContain("footer-custom")
  })
})

describe("Card composition", () => {
  it("renders a fully composed card", () => {
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

    expect(screen.getByText("Active Vehicles")).toBeInTheDocument()
    expect(screen.getByText("Live fleet status")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "View All" })).toBeInTheDocument()
    expect(screen.getByText("24 vehicles online")).toBeInTheDocument()
    expect(screen.getByText("Last updated: now")).toBeInTheDocument()
  })
})