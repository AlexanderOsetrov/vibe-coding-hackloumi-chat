import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchBar from "@/components/SearchBar";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCurrentUser = {
  id: "user1",
  username: "testuser",
};

const mockSearchResults = [
  {
    id: "msg1",
    content: "Hello world, this is a test message",
    createdAt: "2024-01-01T10:00:00Z",
    rank: 0.8,
    sender: {
      id: "user1",
      username: "testuser",
    },
    receiver: {
      id: "user2",
      username: "friend",
    },
    conversationWith: "friend",
  },
  {
    id: "msg2",
    content: "Another message with test content",
    createdAt: "2024-01-01T11:00:00Z",
    rank: 0.6,
    sender: {
      id: "user2",
      username: "friend",
    },
    receiver: {
      id: "user1",
      username: "testuser",
    },
    conversationWith: "friend",
  },
];

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("renders search input correctly", () => {
    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    expect(searchInput).toBeInTheDocument();
  });

  it("shows loading state when searching", async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ results: mockSearchResults }),
      } as Response), 100))
    );

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Should show loading spinner
    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  it("displays search results correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      // Use more flexible text matching that can handle highlighted text
      expect(screen.getByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      })).toBeInTheDocument();
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === "Another message with test content";
      })).toBeInTheDocument();
    });

    // Should show conversation partner names
    expect(screen.getAllByText("friend")).toHaveLength(2);
    
    // Should show result count
    expect(screen.getByText("2 results found")).toBeInTheDocument();
  });

  it("highlights search terms in results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      const highlightedElements = document.querySelectorAll("mark");
      expect(highlightedElements.length).toBeGreaterThan(0);
    });
  });

  it("navigates to chat when result is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      // Find the result by its container and click it
      const firstResult = screen.getByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      });
      const resultContainer = firstResult.closest(".p-3");
      expect(resultContainer).toBeInTheDocument();
      fireEvent.click(resultContainer!);
    });

    expect(mockPush).toHaveBeenCalledWith("/chat/friend");
  });

  it("shows no results message when search returns empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText(/No messages found for/)).toBeInTheDocument();
    });
  });

  it("handles search errors gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Search failed" }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });

  it("closes results when clicking outside", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults }),
    } as Response);

    render(
      <div>
        <SearchBar currentUser={mockCurrentUser} />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      })).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      })).not.toBeInTheDocument();
    });
  });

  it("clears search when escape is pressed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: mockSearchResults }),
    } as Response);

    render(<SearchBar currentUser={mockCurrentUser} />);
    
    const searchInput = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      })).toBeInTheDocument();
    });

    // Press escape
    fireEvent.keyDown(searchInput, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText((content, element) => {
        return element?.textContent === "Hello world, this is a test message";
      })).not.toBeInTheDocument();
    });
  });
}); 