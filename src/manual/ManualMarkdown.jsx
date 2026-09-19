import {
  Children,
} from "react";

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

function getTextContent(
  children
) {
  return Children
    .toArray(children)
    .map((child) => {
      if (
        typeof child === "string" ||
        typeof child === "number"
      ) {
        return String(child);
      }

      return "";
    })
    .join("");
}

function getHeadingId(
  children
) {
  const text =
    getTextContent(children);

  const match =
    text.match(
      /^(\d+)(?:\.(\d+))?\./
    );

  if (!match) {
    return undefined;
  }

  return [
    "manual-section",
    match[1],
    match[2],
  ]
    .filter(Boolean)
    .join("-");
}

const MARKDOWN_COMPONENTS = {
  h2: ({
    children,
  }) => (
    <h2
      id={
        getHeadingId(children)
      }
    >
      {children}
    </h2>
  ),
  h3: ({
    children,
  }) => (
    <h3
      id={
        getHeadingId(children)
      }
    >
      {children}
    </h3>
  ),
};

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
      components={
        MARKDOWN_COMPONENTS
      }
    >
      {source}
    </ReactMarkdown>
  );
}
