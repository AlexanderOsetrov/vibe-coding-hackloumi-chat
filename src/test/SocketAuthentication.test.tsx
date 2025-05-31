import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parse } from "cookie";
import { verifyJWT } from "@/lib/auth";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  verifyJWT: vi.fn(),
}));

// Mock socket.io-client with factory
vi.mock("socket.io-client", () => {
  const mockSocket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: "mock-socket-id",
    io: {
      engine: {
        transport: { name: "websocket" }
      }
    },
    removeAllListeners: vi.fn(),
    once: vi.fn(),
  };

  const mockIo = vi.fn(() => mockSocket);
  
  return {
    default: mockIo,
    io: mockIo,
  };
});

// Mock fetch for authentication
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Socket.IO Authentication Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should extract correct cookie name from headers", () => {
    const cookieHeader = "auth-token=eyJhbGciOiJIUzI1NiJ9.test; other-cookie=value";
    const cookies = parse(cookieHeader);
    
    expect(cookies["auth-token"]).toBe("eyJhbGciOiJIUzI1NiJ9.test");
    expect(cookies["auth_token"]).toBeUndefined(); // Old incorrect name
  });

  it("should handle missing auth cookie", () => {
    const cookieHeader = "other-cookie=value; session=abc123";
    const cookies = parse(cookieHeader);
    
    expect(cookies["auth-token"]).toBeUndefined();
  });

  it("should handle empty cookie header", () => {
    const cookieHeader = "";
    const cookies = parse(cookieHeader);
    
    expect(cookies["auth-token"]).toBeUndefined();
  });

  it("should simulate authentication flow", async () => {
    const { prisma } = await import("@/lib/db");
    
    // Mock valid JWT verification
    const mockVerifyJWT = vi.mocked(verifyJWT);
    mockVerifyJWT.mockResolvedValue({
      userId: "user123",
      username: "testuser",
    });

    // Mock user found in database
    const mockFindUnique = vi.mocked(prisma.user.findUnique);
    mockFindUnique.mockResolvedValue({
      id: "user123",
      username: "testuser",
      password: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Simulate the authentication logic
    const cookieHeader = "auth-token=valid-jwt-token";
    const cookies = parse(cookieHeader);
    const token = cookies["auth-token"];

    expect(token).toBe("valid-jwt-token");

    const payload = await verifyJWT(token);
    expect(payload).toEqual({
      userId: "user123",
      username: "testuser",
    });

    const user = await prisma.user.findUnique({
      where: { id: payload!.userId },
      select: { id: true, username: true },
    });

    expect(user).toMatchObject({
      id: "user123",
      username: "testuser",
    });
  });

  it("should handle invalid JWT token", async () => {
    // Mock invalid JWT verification
    const mockVerifyJWT = vi.mocked(verifyJWT);
    mockVerifyJWT.mockResolvedValue(null);

    const cookieHeader = "auth-token=invalid-jwt-token";
    const cookies = parse(cookieHeader);
    const token = cookies["auth-token"];

    const payload = await verifyJWT(token);
    expect(payload).toBeNull();
  });

  it("should handle JWT verification error", async () => {
    // Mock JWT verification throwing an error
    const mockVerifyJWT = vi.mocked(verifyJWT);
    mockVerifyJWT.mockRejectedValue(new Error("JWT verification failed"));

    const cookieHeader = "auth-token=malformed-token";
    const cookies = parse(cookieHeader);
    const token = cookies["auth-token"];

    await expect(verifyJWT(token)).rejects.toThrow("JWT verification failed");
  });

  it("should handle user not found in database", async () => {
    const { prisma } = await import("@/lib/db");
    
    // Mock valid JWT verification
    const mockVerifyJWT = vi.mocked(verifyJWT);
    mockVerifyJWT.mockResolvedValue({
      userId: "nonexistent-user",
      username: "ghost",
    });

    // Mock user not found in database
    const mockFindUnique = vi.mocked(prisma.user.findUnique);
    mockFindUnique.mockResolvedValue(null);

    const payload = await verifyJWT("valid-token");
    const user = await prisma.user.findUnique({
      where: { id: payload!.userId },
      select: { id: true, username: true },
    });

    expect(user).toBeNull();
  });
}); 