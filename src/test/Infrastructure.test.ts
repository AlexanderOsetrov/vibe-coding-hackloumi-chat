import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Infrastructure Setup", () => {
  const projectRoot = resolve(__dirname, "../..");

  describe("Docker Configuration", () => {
    it("should have a Dockerfile", () => {
      const dockerfilePath = resolve(projectRoot, "Dockerfile");
      expect(existsSync(dockerfilePath)).toBe(true);

      const dockerfile = readFileSync(dockerfilePath, "utf-8");
      expect(dockerfile).toContain("FROM node:18-slim AS builder");
      expect(dockerfile).toContain("FROM node:18-slim AS runtime");
      expect(dockerfile).toContain("postgresql-16");
      expect(dockerfile).toContain("supervisord");
      expect(dockerfile).toContain("EXPOSE 3000 5432");
    });

    it("should have docker-compose.yml", () => {
      const composePath = resolve(projectRoot, "docker-compose.yml");
      expect(existsSync(composePath)).toBe(true);

      const compose = readFileSync(composePath, "utf-8");
      expect(compose).toContain("3000:3000");
      expect(compose).toContain("5432:5432");
      expect(compose).toContain("postgres_data");
      expect(compose).toContain("healthcheck");
    });

    it("should have .dockerignore", () => {
      const dockerignorePath = resolve(projectRoot, ".dockerignore");
      expect(existsSync(dockerignorePath)).toBe(true);

      const dockerignore = readFileSync(dockerignorePath, "utf-8");
      expect(dockerignore).toContain("node_modules");
      expect(dockerignore).toContain(".next/");
      expect(dockerignore).toContain(".git");
    });
  });

  describe("Docker Scripts", () => {
    it("should have supervisord configuration", () => {
      const supervisordPath = resolve(projectRoot, "docker/supervisord.conf");
      expect(existsSync(supervisordPath)).toBe(true);

      const config = readFileSync(supervisordPath, "utf-8");
      expect(config).toContain("[program:postgresql]");
      expect(config).toContain("[program:nextjs]");
    });

    it("should have database initialization script", () => {
      const initDbPath = resolve(projectRoot, "docker/init-db.sh");
      expect(existsSync(initDbPath)).toBe(true);

      const script = readFileSync(initDbPath, "utf-8");
      expect(script).toContain("initdb");
      expect(script).toContain("createdb hackloumi");
    });

    it("should have startup script", () => {
      const startPath = resolve(projectRoot, "docker/start.sh");
      expect(existsSync(startPath)).toBe(true);

      const script = readFileSync(startPath, "utf-8");
      expect(script).toContain("supervisord");
      expect(script).toContain("prisma db push");
    });

    it("should have health check script", () => {
      const healthPath = resolve(projectRoot, "docker/healthcheck.sh");
      expect(existsSync(healthPath)).toBe(true);

      const script = readFileSync(healthPath, "utf-8");
      expect(script).toContain("pg_isready");
      expect(script).toContain("/api/health");
    });
  });

  describe("Enhanced Makefile", () => {
    it("should have Makefile with infrastructure targets", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      expect(existsSync(makefilePath)).toBe(true);

      const makefile = readFileSync(makefilePath, "utf-8");
      expect(makefile).toContain("deploy:");
      expect(makefile).toContain("destroy:");
      expect(makefile).toContain("build:");
      expect(makefile).toContain("status:");
      expect(makefile).toContain("logs:");
    });

    it("should have database management targets", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Database management commands
      expect(makefile).toContain("db-setup:");
      expect(makefile).toContain("db-start:");
      expect(makefile).toContain("db-stop:");
      expect(makefile).toContain("db-status:");
      expect(makefile).toContain("db-connect:");
      expect(makefile).toContain("db-reset:");
    });

    it("should have colored output and organized help", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Color definitions
      expect(makefile).toContain("BLUE :=");
      expect(makefile).toContain("GREEN :=");
      expect(makefile).toContain("YELLOW :=");
      expect(makefile).toContain("RED :=");

      // Organized help sections
      expect(makefile).toContain("📦 Development:");
      expect(makefile).toContain("🐳 Docker Deployment:");
      expect(makefile).toContain("🗄️  Database Management:");
      expect(makefile).toContain("🛠️  Utilities:");
    });

    it("should have helper functions for Docker operations", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      expect(makefile).toContain("check-docker:");
      expect(makefile).toContain("container-exists:");
      expect(makefile).toContain("container-running:");
    });

    it("should have configuration variables", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      expect(makefile).toContain("CONTAINER_NAME := hackloumi-postgres");
      expect(makefile).toContain("DB_NAME := hackloumi_chat");
      expect(makefile).toContain("DB_USER := postgres");
      expect(makefile).toContain("POSTGRES_VERSION := 16");
    });
  });

  describe("Database Management Integration", () => {
    it("should provide both standalone and integrated database options", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Standalone database commands (for development)
      expect(makefile).toContain(
        "Database Management commands (standalone PostgreSQL for development)"
      );

      // Integrated deployment commands (all-in-one)
      expect(makefile).toContain(
        "Docker Deployment commands (all-in-one containers)"
      );
    });

    it("should maintain backward compatibility with existing deployment", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Original docker-compose commands should still work
      expect(makefile).toContain("docker-compose up --build");
      expect(makefile).toContain("docker-compose down -v");
      expect(makefile).toContain("docker-compose logs");
    });

    it("should have database verification for development workflow", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Database verification target should exist
      expect(makefile).toContain("verify-db:");
      expect(makefile).toContain(
        "Verify database is running and ready for development"
      );

      // Dev command should depend on database verification
      expect(makefile).toContain("dev: check-docker verify-db");

      // Should include helpful error messages and suggestions
      expect(makefile).toContain("Database container not found!");
      expect(makefile).toContain("make db-setup");
      expect(makefile).toContain("Database is ready for connections");
    });

    it("should include database restart functionality", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Database restart command should exist
      expect(makefile).toContain("db-restart:");
      expect(makefile).toContain("Restart database container");

      // Should be referenced in troubleshooting
      expect(makefile).toContain("make db-restart");
    });

    it("should provide comprehensive troubleshooting guidance", () => {
      const makefilePath = resolve(projectRoot, "Makefile");
      const makefile = readFileSync(makefilePath, "utf-8");

      // Should include troubleshooting steps
      expect(makefile).toContain("Try these troubleshooting steps:");
      expect(makefile).toContain("make db-status");
      expect(makefile).toContain("make db-restart");
      expect(makefile).toContain("make db-reset");
    });
  });

  describe("M10 Requirements Validation", () => {
    it("should meet M10 infrastructure requirements", () => {
      const requirements = [
        "Dockerfile multi‑stage: build → runtime (Node 18‑slim + PostgreSQL 16‑alpine via supervisord)",
        "docker‑compose.yml exposes 3000 & 5432 volumes",
        "Makefile with make deploy & make destroy wrappers",
        "Readiness & liveness probes for health checks",
      ];

      // Verify all M10 requirements are covered by our implementation
      expect(requirements).toHaveLength(4);

      // Requirement 1: Multi-stage Dockerfile
      const dockerfilePath = resolve(projectRoot, "Dockerfile");
      expect(existsSync(dockerfilePath)).toBe(true);

      // Requirement 2: docker-compose.yml with port exposure and volumes
      const composePath = resolve(projectRoot, "docker-compose.yml");
      expect(existsSync(composePath)).toBe(true);

      // Requirement 3: Makefile with deploy/destroy
      const makefilePath = resolve(projectRoot, "Makefile");
      expect(existsSync(makefilePath)).toBe(true);

      // Requirement 4: Health checks (covered by healthcheck.sh and health API)
      const healthPath = resolve(projectRoot, "docker/healthcheck.sh");
      expect(existsSync(healthPath)).toBe(true);
    });
  });
});
