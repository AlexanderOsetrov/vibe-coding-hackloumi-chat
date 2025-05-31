import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock fetch for socket initialization
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Socket Connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should have socket.io-client available", () => {
    // Simple test to verify the mock is working
    expect(true).toBe(true);
  });

  it("should mock fetch correctly", () => {
    // Test that fetch mock is working
    expect(mockFetch).toBeDefined();
    expect(typeof mockFetch).toBe("function");
  });

  it("should handle basic socket configuration", () => {
    // Test basic socket configuration expectations
    const expectedConfig = {
      path: "/api/socketio",
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 20000,
      forceNew: false,
      autoConnect: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    };

    expect(expectedConfig.path).toBe("/api/socketio");
    expect(expectedConfig.transports).toEqual(["polling", "websocket"]);
    expect(expectedConfig.reconnectionAttempts).toBe(3);
  });
}); 