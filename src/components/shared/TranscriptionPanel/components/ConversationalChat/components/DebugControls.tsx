import React from "react";
import { DebugControlsProps } from "../types/ChatTypes";

/**
 * Debug controls component
 * Follows YAGNI principle - separate debug functionality that can be easily removed
 * Only rendered in development mode
 */
export const DebugControls: React.FC<DebugControlsProps> = ({
  onAddTestMessage,
  onAddTestAI,
  onRestore,
  onClearAll,
  hasBackup,
}) => {
  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const buttonStyle = {
    fontSize: "12px",
    padding: "4px 8px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    margin: "0 2px",
  };

  return (
    <div className="debug-controls" style={{ marginRight: "8px" }}>
      <button
        className="control-btn"
        onClick={onAddTestMessage}
        title="Add test user message"
        style={{ ...buttonStyle, backgroundColor: "#4CAF50" }}
        type="button"
      >
        Test User
      </button>

      <button
        className="control-btn"
        onClick={onAddTestAI}
        title="Add test AI response"
        style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
        type="button"
      >
        Test AI
      </button>

      {hasBackup && (
        <button
          className="control-btn"
          onClick={onRestore}
          title="Restore from backup"
          style={{ ...buttonStyle, backgroundColor: "#FF9800" }}
          type="button"
        >
          Restore
        </button>
      )}

      <button
        className="control-btn"
        onClick={onClearAll}
        title="Clear all messages and backup"
        style={{ ...buttonStyle, backgroundColor: "#F44336" }}
        type="button"
      >
        Clear All
      </button>
    </div>
  );
};
