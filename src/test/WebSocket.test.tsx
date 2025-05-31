import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSocket } from "@/hooks/useSocket";

// Mock Socket.IO client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: {
      engine: {
        transport: { name: "websocket" },
        on: vi.fn(),
      },
    },
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe("WebSocket Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Socket.IO server ready" }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize WebSocket connection", async () => {
    const TestComponent = () => {
      const { connectionType } = useSocket();
      return <div data-testid="connection-type">{connectionType}</div>;
    };

    render(<TestComponent />);

    // Initially should be disconnected
    expect(screen.getByTestId("connection-type")).toHaveTextContent(
      "disconnected"
    );
  });

  it("should handle message sending", async () => {
    const onMessageSent = vi.fn();

    const TestComponent = () => {
      const { sendMessage } = useSocket({ onMessageSent });

      return (
        <button
          onClick={() => sendMessage("Hello", "testuser")}
          data-testid="send-button"
        >
          Send
        </button>
      );
    };

    render(<TestComponent />);

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    // Should attempt to send via HTTP fallback when WebSocket is not connected
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Hello",
          receiverUsername: "testuser",
        }),
      });
    });
  });

  it("should handle typing indicators", () => {
    const TestComponent = () => {
      const { startTyping, stopTyping } = useSocket();

      return (
        <div>
          <button
            onClick={() => startTyping("testuser")}
            data-testid="start-typing"
          >
            Start Typing
          </button>
          <button
            onClick={() => stopTyping("testuser")}
            data-testid="stop-typing"
          >
            Stop Typing
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    const startButton = screen.getByTestId("start-typing");
    const stopButton = screen.getByTestId("stop-typing");

    // Should not throw errors when WebSocket is not connected
    expect(() => {
      fireEvent.click(startButton);
      fireEvent.click(stopButton);
    }).not.toThrow();
  });
});
