// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import "highlight.js/styles/atom-one-dark.css";
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// State machine for buffering incomplete markdown during streaming
class MarkdownStateMachine {
  private state: "text" | "link_text" | "exit_link_text" | "link_url" = "text";
  private buffer: string = "";
  private urlBuffer: string = "";

  processChunk(chunk: string): string {
    let result = "";

    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      const prevChar = i > 0 ? chunk[i - 1] : "";

      // Handle escape sequences
      if (prevChar === "\\") {
        result += char;
        continue;
      }

      switch (this.state) {
        case "text":
          if (char === "[") {
            this.state = "link_text";
            this.buffer = char;
          } else {
            result += char;
          }
          break;

        case "link_text":
          this.buffer += char;
          if (char === "]") {
            this.state = "exit_link_text";
          }
          break;

        case "exit_link_text":
          if (char === "(") {
            this.state = "link_url";
            this.urlBuffer = "";
            // Don't add to result yet - buffer the link
          } else {
            // Not a link, output buffered content
            result += this.buffer + char;
            this.buffer = "";
            this.state = "text";
          }
          break;

        case "link_url":
          if (char === ")") {
            // Complete link found, output it
            result += this.buffer + "(" + this.urlBuffer + ")";
            this.buffer = "";
            this.urlBuffer = "";
            this.state = "text";
          } else {
            this.urlBuffer += char;
          }
          break;
      }
    }

    // If we're in text state, add any buffered content
    if (this.state === "text" && this.buffer) {
      result += this.buffer;
      this.buffer = "";
    }

    return result;
  }

  getBufferedContent(): string {
    if (this.state === "text") return "";

    // Return partial content for incomplete elements
    switch (this.state) {
      case "link_text":
        return this.buffer;
      case "exit_link_text":
        return this.buffer;
      case "link_url":
        return this.buffer + "(" + this.urlBuffer;
      default:
        return "";
    }
  }

  reset(): void {
    this.state = "text";
    this.buffer = "";
    this.urlBuffer = "";
  }
}

// Singleton state machine for streaming
const markdownStateMachine = new MarkdownStateMachine();

/**
 * Pre-process LaTeX content for remark-math compatibility
 * Converts OpenAI format \(...\) and \[...\] to $...$ and $$...$$
 */
const preprocessLaTeX = (content: string): string => {
  return content
    .replace(/\\\[(.*?)\\\]/gs, (_, eq) => `$$${eq}$$`) // block math
    .replace(/\\\((.*?)\\\)/gs, (_, eq) => `$${eq}$`); // inline math
};

/**
 * Clean and normalize content for better markdown processing
 */
const cleanContent = (content: string): string => {
  return content
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive line breaks
    .replace(/\s+$/gm, "") // Remove trailing whitespace
    .trim();
};

/**
 * Process content for streaming to prevent incomplete markdown rendering
 */
const processStreamingContent = (
  content: string,
  isStreaming: boolean
): string => {
  if (!isStreaming) {
    markdownStateMachine.reset();
    return content;
  }

  // Process content through state machine to buffer incomplete elements
  const processedContent = markdownStateMachine.processChunk(content);

  // For streaming, return processed content without incomplete elements
  return processedContent;
};

/**
 * Custom components for enhanced markdown rendering
 */
const markdownComponents = {
  // Enhanced links with external handling
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="markdown-link"
      {...props}
    >
      {children}
    </a>
  ),

  // Enhanced code blocks
  code: ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";

    if (inline) {
      return (
        <code className="markdown-code-inline" {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // Enhanced pre blocks (for code blocks)
  pre: ({ children, ...props }: any) => {
    // Extract language from the code element if present
    const codeElement = React.Children.toArray(children).find(
      (child: any) => child?.type === 'code'
    ) as any;
    
    const className = codeElement?.props?.className || "";
    const match = /language-(\w+)/.exec(className);
    const language = match ? match[1] : "";

    return (
      <pre className="markdown-code-block" {...props}>
        {children}
        {language && <span className="markdown-code-language">{language}</span>}
      </pre>
    );
  },

  // Enhanced blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="markdown-blockquote" {...props}>
      {children}
    </blockquote>
  ),

  // Enhanced lists
  ul: ({ children, ...props }: any) => (
    <ul className="markdown-list" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }: any) => (
    <ol className="markdown-list-ordered" {...props}>
      {children}
    </ol>
  ),

  // Enhanced tables
  table: ({ children, ...props }: any) => (
    <div className="markdown-table-wrapper">
      <table className="markdown-table" {...props}>
        {children}
      </table>
    </div>
  ),
};

/**
 * MarkdownRenderer component with streaming support
 * Prevents Flash of Incomplete Markdown (FOIM) during streaming
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  const processedContent = useMemo(() => {
    if (!content) return "";

    // Clean and preprocess content
    const cleaned = cleanContent(content);
    const latexProcessed = preprocessLaTeX(cleaned);

    // Process for streaming to prevent incomplete elements
    const streamingProcessed = processStreamingContent(
      latexProcessed,
      isStreaming
    );

    return streamingProcessed;
  }, [content, isStreaming]);

  // Show buffered content during streaming
  const bufferedContent = useMemo(() => {
    if (!isStreaming) return "";
    return markdownStateMachine.getBufferedContent();
  }, [content, isStreaming]);

  return (
    <div className="markdown-renderer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>

      {/* Show buffered incomplete content during streaming */}
      {isStreaming && bufferedContent && (
        <span className="markdown-buffered-content">{bufferedContent}</span>
      )}
    </div>
  );
};

export default MarkdownRenderer;
