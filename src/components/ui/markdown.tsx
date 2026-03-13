import { Fragment } from "react";

type MarkdownRendererProps = {
  content: string;
};

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "code-block"; code: string };

// Matches bold, inline code, italic — order matters: ** before *, __ before _
const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;

function renderInline(text: string): React.ReactNode {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={i}
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const flushParagraph = (blocks: Block[], lines: string[]) => {
  if (lines.length === 0) return;
  const text = lines.join(" ").trim();
  if (text.length > 0) blocks.push({ type: "paragraph", text });
  lines.length = 0;
};

const flushList = (blocks: Block[], items: string[], ordered: boolean) => {
  if (items.length === 0) return;
  blocks.push({ type: ordered ? "ordered-list" : "unordered-list", items: [...items] });
  items.length = 0;
};

const parseMarkdown = (content: string): Block[] => {
  const rawLines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  let inOrderedList = false;
  let inCodeBlock = false;
  const codeLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();

    // Fenced code block
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        flushParagraph(blocks, paragraphLines);
        flushList(blocks, listItems, inOrderedList);
        inCodeBlock = true;
        codeLines.length = 0;
      } else {
        blocks.push({ type: "code-block", code: codeLines.join("\n") });
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listItems, inOrderedList);
      continue;
    }

    // ATX headings
    if (trimmed.startsWith("#")) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listItems, inOrderedList);
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const depth = match[1].length;
        const level: 2 | 3 | 4 = depth === 1 ? 2 : depth === 2 ? 3 : 4;
        blocks.push({ type: "heading", level, text: match[2] });
      }
      continue;
    }

    // Unordered list items
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(blocks, paragraphLines);
      if (inOrderedList) flushList(blocks, listItems, true);
      inOrderedList = false;
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(blocks, paragraphLines);
      if (!inOrderedList && listItems.length > 0) flushList(blocks, listItems, false);
      inOrderedList = true;
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    // ALL CAPS short lines — heuristic for AI-generated section labels
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length <= 40) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listItems, inOrderedList);
      blocks.push({ type: "heading", level: 4, text: trimmed });
      continue;
    }

    paragraphLines.push(trimmed);
  }

  // Flush anything remaining
  if (inCodeBlock) blocks.push({ type: "code-block", code: codeLines.join("\n") });
  flushParagraph(blocks, paragraphLines);
  flushList(blocks, listItems, inOrderedList);

  return blocks;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h3" : block.level === 3 ? "h4" : "h5";
          const className =
            block.level === 2
              ? "text-base font-semibold text-foreground"
              : block.level === 3
                ? "text-sm font-semibold text-foreground"
                : "border-l-2 border-foreground/20 pl-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground";
          return (
            <Tag key={key} className={className}>
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={key} className="text-sm leading-relaxed text-foreground">
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={key} className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        // code-block
        return (
          <pre
            key={key}
            className="overflow-x-auto rounded-lg border border-border bg-foreground/5 p-4 font-mono text-xs text-foreground"
          >
            <code>{block.code}</code>
          </pre>
        );
      })}
    </div>
  );
}
