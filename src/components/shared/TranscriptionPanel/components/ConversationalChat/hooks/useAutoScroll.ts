// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { MutableRefObject, useEffect, useRef } from "react";

/**
 * Custom hook for auto-scrolling to bottom when content changes
 * Based on chat scroll pattern from https://davelage.com/posts/chat-scroll-react/
 *
 * @param deps - Dependencies that trigger scroll when changed
 * @param options - Scroll behavior options
 * @returns ref to attach to the scrollable element
 */
export function useAutoScroll<T extends HTMLElement>(
  deps: any[],
  options: ScrollToOptions = { behavior: "smooth" }
): MutableRefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      // Small delay to ensure DOM is updated
      const scrollTimer = setTimeout(() => {
        if (ref.current) {
          ref.current.scrollTo({
            top: ref.current.scrollHeight,
            left: 0,
            ...options,
          });
        }
      }, 50);

      return () => clearTimeout(scrollTimer);
    }
  }, deps);

  return ref;
}

/**
 * Alternative version that uses scrollIntoView
 * Useful when you want to scroll a specific element into view
 */
export function useScrollIntoView<T extends HTMLElement>(
  deps: any[],
  alignToTop: boolean = false
): MutableRefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      const scrollTimer = setTimeout(() => {
        if (ref.current) {
          ref.current.scrollIntoView(alignToTop);
        }
      }, 50);

      return () => clearTimeout(scrollTimer);
    }
  }, deps);

  return ref;
}
