import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { readFileSync } from "fs";

describe("PostCSS Configuration", () => {
  it("should have a valid postcss.config.mjs file", () => {
    const configPath = resolve(process.cwd(), "postcss.config.mjs");

    expect(() => {
      const config = readFileSync(configPath, "utf-8");
      expect(config).toContain("tailwindcss");
      expect(config).toContain("autoprefixer");
    }).not.toThrow();
  });

  it("should have a valid tailwind.config.js file", () => {
    const configPath = resolve(process.cwd(), "tailwind.config.js");

    expect(() => {
      const config = readFileSync(configPath, "utf-8");
      expect(config).toContain("content");
      expect(config).toContain("./src/app/**/*.{js,ts,jsx,tsx,mdx}");
    }).not.toThrow();
  });

  it("should have correct global CSS imports", () => {
    const cssPath = resolve(process.cwd(), "src/app/globals.css");

    expect(() => {
      const css = readFileSync(cssPath, "utf-8");
      expect(css).toContain("@tailwind base");
      expect(css).toContain("@tailwind components");
      expect(css).toContain("@tailwind utilities");
    }).not.toThrow();
  });

  it("should define CSS variables correctly", () => {
    const cssPath = resolve(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf-8");

    expect(css).toContain("--background:");
    expect(css).toContain("--foreground:");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });
});
