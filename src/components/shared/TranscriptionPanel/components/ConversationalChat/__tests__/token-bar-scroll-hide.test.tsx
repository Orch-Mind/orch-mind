// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { render } from "@testing-library/react";
import { TokenStatusBar } from "../components/TokenStatusBar";

describe("TokenStatusBar scroll-based visibility", () => {
  it("should have normal visibility when not at top", () => {
    const { container } = render(
      <TokenStatusBar
        currentTokens={5000}
        maxTokens={32000}
        summarizationThreshold={30000}
        isAtTop={false}
      />
    );

    const statusBar = container.querySelector(".token-status-bar");
    expect(statusBar?.classList.contains("at-top")).toBe(false);
  });

  it("should add at-top class when scroll is at top", () => {
    const { container } = render(
      <TokenStatusBar
        currentTokens={5000}
        maxTokens={32000}
        summarizationThreshold={30000}
        isAtTop={true}
      />
    );

    const statusBar = container.querySelector(".token-status-bar");
    expect(statusBar?.classList.contains("at-top")).toBe(true);
  });

  it("should apply critical at-top styling when critical and at top", () => {
    const { container } = render(
      <TokenStatusBar
        currentTokens={30000} // 93.75% - critical status
        maxTokens={32000}
        summarizationThreshold={30000}
        isAtTop={true}
      />
    );

    const statusBar = container.querySelector(".token-status-bar");
    expect(statusBar?.classList.contains("critical")).toBe(true);
    expect(statusBar?.classList.contains("at-top")).toBe(true);
  });
}); 