import React from "react";
import { ScrollButtonProps } from "../types/ChatTypes";

/**
 * Scroll to bottom button component
 * Follows Single Responsibility Principle - only handles scroll button
 */
export const ScrollToBottomButton: React.FC<ScrollButtonProps> = ({
  show,
  onClick,
}) => {
  if (!show) return null;

  return (
    <button
      className="scroll-to-bottom-btn"
      onClick={onClick}
      title="Scroll to bottom"
      type="button"
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 250, 255, 0.9)",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0, 250, 255, 0.3)",
        zIndex: 10,
        transition: "all 0.2s ease",
        animation: "fadeIn 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateX(-50%) scale(1.1)";
        e.currentTarget.style.background = "rgba(0, 250, 255, 1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateX(-50%) scale(1)";
        e.currentTarget.style.background = "rgba(0, 250, 255, 0.9)";
      }}
    >
      ↓
    </button>
  );
};
