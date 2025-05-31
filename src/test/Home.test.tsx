import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home Page", () => {
  it("should render the Next.js logo", () => {
    render(<Home />);
    const logo = screen.getByAltText("Next.js logo");
    expect(logo).toBeInTheDocument();
  });

  it("should render the main heading text", () => {
    render(<Home />);
    const heading = screen.getByText(/Get started by editing/);
    expect(heading).toBeInTheDocument();
  });

  it("should render the deploy button", () => {
    render(<Home />);
    const deployButton = screen.getByText("Deploy now");
    expect(deployButton).toBeInTheDocument();
  });

  it("should render the docs link", () => {
    render(<Home />);
    const docsLink = screen.getByText("Read our docs");
    expect(docsLink).toBeInTheDocument();
  });
});
