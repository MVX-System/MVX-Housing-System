import ReactMarkdown
  from "react-markdown";

export const LEGAL_MARKDOWN_ALLOWED_ELEMENTS =
  Object.freeze([
    "h1",
    "h2",
    "h3",
    "p",
    "ul",
    "li",
    "blockquote",
    "code",
    "strong",
    "em",
    "br",
  ]);

export default function LegalMarkdown({
  markdown,
}) {
  const source =
    typeof markdown === "string"
      ? markdown
      : "";

  return (
    <ReactMarkdown
      allowedElements={
        LEGAL_MARKDOWN_ALLOWED_ELEMENTS
      }
      skipHtml={true}
      unwrapDisallowed={true}
    >
      {source}
    </ReactMarkdown>
  );
}
