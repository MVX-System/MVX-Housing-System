import ReactMarkdown
  from "react-markdown";

export const MANUAL_MARKDOWN_ALLOWED_ELEMENTS =
  Object.freeze([
    "h1",
    "h2",
    "h3",
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "strong",
    "em",
    "br",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ]);

export default function ManualMarkdown({
  markdown,
}) {
  const source =
    typeof markdown === "string"
      ? markdown
      : "";

  return (
    <ReactMarkdown
      allowedElements={
        MANUAL_MARKDOWN_ALLOWED_ELEMENTS
      }
      skipHtml={true}
      unwrapDisallowed={true}
    >
      {source}
    </ReactMarkdown>
  );
}
