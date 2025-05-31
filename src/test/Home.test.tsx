import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "../app/page";

describe("Home Page", () => {
  it("should render the main heading", () => {
    render(<Home />);
    const heading = screen.getByText("Hacklumi Chat 💬");
    expect(heading).toBeInTheDocument();
  });

  it("should render the description text", () => {
    render(<Home />);
    const description = screen.getByText(/A modern, privacy‑respecting chat platform/);
    expect(description).toBeInTheDocument();
  });

  it("should render the Create Account button", () => {
    render(<Home />);
    const createButton = screen.getByText("Create Account");
    expect(createButton).toBeInTheDocument();
  });

  it("should render the Sign In button", () => {
    render(<Home />);
    const signInButton = screen.getByText("Sign In");
    expect(signInButton).toBeInTheDocument();
  });

  it("should render feature cards", () => {
    render(<Home />);
    const privacyFeature = screen.getByText("🔐 Privacy First");
    const chatFeature = screen.getByText("💬 Real-time Chat");
    const techFeature = screen.getByText("🚀 Modern Tech");
    
    expect(privacyFeature).toBeInTheDocument();
    expect(chatFeature).toBeInTheDocument();
    expect(techFeature).toBeInTheDocument();
  });

  it("should have correct links", () => {
    render(<Home />);
    const createAccountLink = screen.getByRole("link", { name: "Create Account" });
    const signInLink = screen.getByRole("link", { name: "Sign In" });
    
    expect(createAccountLink).toHaveAttribute("href", "/register");
    expect(signInLink).toHaveAttribute("href", "/login");
  });
});
