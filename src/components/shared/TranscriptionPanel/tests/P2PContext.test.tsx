// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { P2PProvider, useP2PContext } from "../context/P2PContext";

// Mock P2P service
jest.mock("../../../../services/p2p/P2PShareService", () => ({
  p2pShareService: {
    isInitialized: jest.fn(() => false),
    initialize: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn(),
    joinGeneralRoom: jest.fn(() => Promise.resolve()),
    joinRoom: jest.fn(() => Promise.resolve()),
    leaveRoom: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Test component that uses the context
const TestComponent = () => {
  const { status, connect, disconnect } = useP2PContext();

  return (
    <div>
      <div data-testid="p2p-status">
        {status.isConnected ? "Connected" : "Disconnected"}
      </div>
      <div data-testid="loading-status">
        {status.isLoading ? "Loading" : "Not Loading"}
      </div>
      <button data-testid="connect-btn" onClick={() => connect("general")}>
        Connect
      </button>
      <button data-testid="disconnect-btn" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
};

describe("P2PContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it("should render with default disconnected state", () => {
    render(
      <P2PProvider>
        <TestComponent />
      </P2PProvider>
    );

    expect(screen.getByTestId("p2p-status")).toHaveTextContent("Disconnected");
    expect(screen.getByTestId("loading-status")).toHaveTextContent(
      "Not Loading"
    );
  });

  it("should provide context methods", () => {
    render(
      <P2PProvider>
        <TestComponent />
      </P2PProvider>
    );

    expect(screen.getByTestId("connect-btn")).toBeInTheDocument();
    expect(screen.getByTestId("disconnect-btn")).toBeInTheDocument();
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => render(<TestComponent />)).toThrow(
      "useP2PContext must be used within P2PProvider"
    );

    console.error = originalError;
  });

  it("should handle localStorage persistence", () => {
    // Mock persisted state
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "orch-p2p-state") {
        return JSON.stringify({
          lastConnectionType: "general",
          lastRoomCode: "",
          isSharing: false,
          sharedAdapterIds: [],
          roomHistory: [],
        });
      }
      return null;
    });

    render(
      <P2PProvider>
        <TestComponent />
      </P2PProvider>
    );

    // Context should be available
    expect(screen.getByTestId("p2p-status")).toBeInTheDocument();
  });
});

// Test auto-reconnection scenarios
describe("P2PContext Auto-reconnection", () => {
  it("should handle persisted connection state", () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        lastConnectionType: "local",
        lastRoomCode: "TEST-123",
        isSharing: true,
        sharedAdapterIds: ["adapter1"],
        roomHistory: [
          { type: "local", code: "TEST-123", timestamp: Date.now() },
        ],
      })
    );

    render(
      <P2PProvider>
        <TestComponent />
      </P2PProvider>
    );

    // Should initialize with disconnected state first
    expect(screen.getByTestId("p2p-status")).toHaveTextContent("Disconnected");
  });
});
