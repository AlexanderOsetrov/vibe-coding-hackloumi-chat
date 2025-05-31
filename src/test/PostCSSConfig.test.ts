import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("PostCSS Configuration", () => {
  it("should have PostCSS config file", () => {
    const configPath = join(process.cwd(), "postcss.config.mjs");
    expect(existsSync(configPath)).toBe(true);
  });

  it("should have Tailwind CSS config file", () => {
    const configPath = join(process.cwd(), "tailwind.config.js");
    expect(existsSync(configPath)).toBe(true);
  });

  it("should have globals.css file", () => {
    const cssPath = join(process.cwd(), "src/app/globals.css");
    expect(existsSync(cssPath)).toBe(true);
  });

  it("should include Tailwind directives", () => {
    const cssPath = join(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain("@tailwind base;");
    expect(css).toContain("@tailwind components;");
    expect(css).toContain("@tailwind utilities;");
  });

  it("should have proper component classes", () => {
    const cssPath = join(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain(".btn-primary");
    expect(css).toContain(".btn-secondary");
    expect(css).toContain(".card");
    expect(css).toContain(".input-field");
    expect(css).toContain(".sidebar");
  });

  it("should define modern design styles", () => {
    const cssPath = join(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain("bg-black text-white");
    expect(css).toContain("font-light antialiased");
    expect(css).toContain("bg-zinc-950 border border-zinc-900");
    expect(css).toContain("transition-all duration-200");
  });

  it("should have custom scrollbar styles", () => {
    const cssPath = join(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain("::-webkit-scrollbar");
    expect(css).toContain("::selection");
  });
});
