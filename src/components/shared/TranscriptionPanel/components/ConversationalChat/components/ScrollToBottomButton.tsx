import React, { useEffect, useRef } from "react";

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * Scroll to bottom button component
 * Follows KISS principle - simple button with single purpose
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  show,
  onClick,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    // Handle wheel events on the button
    const handleWheel = (e: WheelEvent) => {
      // Prevent default to avoid any conflicts
      e.preventDefault();

      // Find the chat messages container
      const chatMessages = document.querySelector(".chat-messages");
      if (chatMessages) {
        // Manually scroll the chat container
        chatMessages.scrollTop += e.deltaY;
      }
    };

    // Add wheel event listener
    button.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      button.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      className={`scroll-to-bottom-btn ${show ? "visible" : ""}`}
      onClick={onClick}
      aria-label="Scroll to bottom"
      type="button"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="scrollGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M12 4v12m0 0l-6-6m6 6l6-6"
          stroke="url(#scrollGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 20h14"
          stroke="url(#scrollGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
};
