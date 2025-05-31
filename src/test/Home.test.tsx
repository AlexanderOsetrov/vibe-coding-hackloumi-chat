import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the main heading", () => {
    render(<Home />);
    const heading = screen.getByText("HACKLOUMI CHAT");
    expect(heading).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Home />);
    const createAccountLink = screen.getByText("Create Account");
    const signInLink = screen.getByText("Sign In");
    expect(createAccountLink).toBeInTheDocument();
    expect(signInLink).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<Home />);
    const description = screen.getByText(
      /A modern, minimalistic chat platform/
    );
    expect(description).toBeInTheDocument();
  });

  it("should render feature cards", () => {
    render(<Home />);
    const privacyFeature = screen.getByText("Privacy First");
    const chatFeature = screen.getByText("Real-time Chat");
    const techFeature = screen.getByText("Modern Stack");

    expect(privacyFeature).toBeInTheDocument();
    expect(chatFeature).toBeInTheDocument();
    expect(techFeature).toBeInTheDocument();
  });

  it("should render Get Started section", () => {
    render(<Home />);
    const getStarted = screen.getByText("Get Started");
    expect(getStarted).toBeInTheDocument();
  });
});
