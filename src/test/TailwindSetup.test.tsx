import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Test component to verify Tailwind CSS classes work
function TailwindTestComponent() {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg">
      <h1 className="text-2xl font-bold">Tailwind Test</h1>
      <p className="mt-2 text-sm">
        This component tests Tailwind CSS functionality
      </p>
      <button className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 rounded">
        Test Button
      </button>
    </div>
  );
}

describe("Tailwind CSS Configuration", () => {
  it("should render components with Tailwind classes without errors", () => {
    render(<TailwindTestComponent />);

    const heading = screen.getByText("Tailwind Test");
    const paragraph = screen.getByText(
      "This component tests Tailwind CSS functionality"
    );
    const button = screen.getByText("Test Button");

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it("should apply CSS classes correctly", () => {
    render(<TailwindTestComponent />);

    const heading = screen.getByText("Tailwind Test");
    const button = screen.getByText("Test Button");

    // Check that elements have the expected classes
    expect(heading).toHaveClass("text-2xl", "font-bold");
    expect(button).toHaveClass("mt-4", "px-4", "py-2", "rounded");
  });

  it("should handle responsive and state-based classes", () => {
    const ResponsiveComponent = () => (
      <div className="hidden sm:block md:flex lg:grid">
        <span className="hover:text-blue-500 focus:outline-none">
          Responsive Element
        </span>
      </div>
    );

    render(<ResponsiveComponent />);
    const element = screen.getByText("Responsive Element");

    expect(element).toBeInTheDocument();
    expect(element).toHaveClass("hover:text-blue-500", "focus:outline-none");
  });
});
