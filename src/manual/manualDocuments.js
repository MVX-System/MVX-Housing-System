const residentRawModules = import.meta.glob(
  "../../docs/manual/v0.0/resident-mode/*.md",
  {
    query: "?raw",
    import: "default",
    eager: true,
  }
);

const adminRawModules = import.meta.glob(
  "../../docs/manual/v0.0/admin-mode/*.md",
  {
    query: "?raw",
    import: "default",
    eager: true,
  }
);

const rawModules = {
  ...residentRawModules,
  ...adminRawModules,
};

export const MANUAL_MODES =
  Object.freeze([
    "resident",
    "admin",
  ]);

export const MANUAL_LANGUAGES =
  Object.freeze([
    "lv",
    "en",
    "ru",
  ]);

const MANUAL_STATUSES =
  Object.freeze([
    "draft",
    "reviewed",
    "approved-for-v0.0",
  ]);

const EXPECTED_DOCUMENT_IDS =
  Object.freeze({
    resident: "MAN-RES-01",
    admin: "MAN-ADM-01",
  });

const EXPECTED_TITLES =
  Object.freeze({
    "resident/lv":
      "MVX V0.0 iedzīvotāja režīma rokasgrāmata",
    "resident/en":
      "MVX V0.0 Resident Mode Manual",
    "resident/ru":
      "Руководство по режиму жильца MVX V0.0",
    "admin/lv":
      "MVX V0.0 administratora režīma rokasgrāmata",
    "admin/en":
      "MVX V0.0 Admin Mode Manual",
    "admin/ru":
      "Руководство по режиму администратора MVX V0.0",
  });

const REQUIRED_FIELDS =
  Object.freeze([
    "document_id",
    "version",
    "language",
    "translation_of",
    "status",
    "applies_to",
    "mode",
    "source_revision",
    "last_reviewed",
    "public",
    "requires_acceptance",
  ]);

const PATH_PATTERN =
  /\/docs\/manual\/v0\.0\/(resident-mode|admin-mode)\/(lv|en|ru)\.md$/;

function parseScalar(value) {
  const trimmed =
    String(value ?? "").trim();

  if (trimmed === "null") {
    return null;
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (
    trimmed.length >= 2 &&
    (
      (
        trimmed.startsWith("\"") &&
        trimmed.endsWith("\"")
      ) ||
      (
        trimmed.startsWith("'") &&
        trimmed.endsWith("'")
      )
    )
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseManualFrontmatter(
  source
) {
  if (
    typeof source !== "string" ||
    !source.startsWith("---\n")
  ) {
    throw new Error(
      "manual_frontmatter_opening_missing"
    );
  }

  const end =
    source.indexOf(
      "\n---\n",
      4
    );

  if (end === -1) {
    throw new Error(
      "manual_frontmatter_closing_missing"
    );
  }

  const metadata = {};
  const frontmatterSource =
    source.slice(4, end);

  for (
    const rawLine
    of frontmatterSource.split("\n")
  ) {
    const line =
      rawLine.trim();

    if (!line) {
      continue;
    }

    const separator =
      line.indexOf(":");

    if (separator <= 0) {
      throw new Error(
        "manual_frontmatter_line_invalid"
      );
    }

    const key =
      line
        .slice(0, separator)
        .trim();

    if (
      !/^[a-z][a-z0-9_]*$/.test(
        key
      )
    ) {
      throw new Error(
        "manual_frontmatter_key_invalid"
      );
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          metadata,
          key
        )
    ) {
      throw new Error(
        "manual_frontmatter_key_duplicate"
      );
    }

    metadata[key] =
      parseScalar(
        line.slice(
          separator + 1
        )
      );
  }

  return {
    metadata,
    body:
      source.slice(end + 5),
  };
}

function validateDocument(
  document
) {
  const {
    mode,
    language,
    metadata,
    body,
  } = document;

  for (
    const field
    of REQUIRED_FIELDS
  ) {
    if (
      !Object.prototype
        .hasOwnProperty
        .call(
          metadata,
          field
        )
    ) {
      throw new Error(
        `manual_frontmatter_missing:${field}`
      );
    }
  }

  if (
    Object.keys(metadata).length !==
    REQUIRED_FIELDS.length
  ) {
    throw new Error(
      "manual_frontmatter_fields_invalid"
    );
  }

  if (
    metadata.document_id !==
    EXPECTED_DOCUMENT_IDS[mode]
  ) {
    throw new Error(
      "manual_document_id_mismatch"
    );
  }

  if (
    metadata.version !== "1.0" ||
    metadata.applies_to !==
      "MVX V0.0"
  ) {
    throw new Error(
      "manual_version_contract_invalid"
    );
  }

  if (
    metadata.mode !== mode ||
    metadata.language !== language
  ) {
    throw new Error(
      "manual_identity_mismatch"
    );
  }

  if (
    language === "lv"
      ? metadata.translation_of !==
        null
      : metadata.translation_of !==
        "lv"
  ) {
    throw new Error(
      "manual_translation_contract_invalid"
    );
  }

  if (
    !MANUAL_STATUSES.includes(
      metadata.status
    )
  ) {
    throw new Error(
      "manual_status_invalid"
    );
  }

  if (
    !String(
      metadata.source_revision
    ).trim() ||
    !String(
      metadata.last_reviewed
    ).trim()
  ) {
    throw new Error(
      "manual_review_metadata_invalid"
    );
  }

  if (
    metadata.public !== false ||
    metadata.requires_acceptance !==
      false
  ) {
    throw new Error(
      "manual_access_contract_invalid"
    );
  }

  const headingMatch =
    body.match(/^# (.+)$/m);

  if (
    !headingMatch ||
    headingMatch[1].trim() !==
      EXPECTED_TITLES[
        `${mode}/${language}`
      ]
  ) {
    throw new Error(
      "manual_title_mismatch"
    );
  }

  if (/\{\{[^{}]+\}\}/.test(body)) {
    throw new Error(
      "manual_runtime_token_not_allowed"
    );
  }
}

function createDocumentIndex() {
  const index =
    new Map();

  for (
    const [
      modulePath,
      source,
    ]
    of Object.entries(rawModules)
  ) {
    if (
      typeof source !== "string"
    ) {
      throw new Error(
        "manual_markdown_import_invalid"
      );
    }

    const match =
      modulePath.match(
        PATH_PATTERN
      );

    if (!match) {
      throw new Error(
        "manual_markdown_path_invalid"
      );
    }

    const mode =
      match[1] ===
        "resident-mode"
        ? "resident"
        : "admin";

    const language =
      match[2];

    const {
      metadata,
      body,
    } =
      parseManualFrontmatter(
        source
      );

    const document = {
      mode,
      language,
      metadata:
        Object.freeze({
          ...metadata,
        }),
      body,
    };

    validateDocument(
      document
    );

    const key =
      `${mode}/${language}`;

    if (index.has(key)) {
      throw new Error(
        "manual_document_duplicate"
      );
    }

    index.set(
      key,
      Object.freeze(document)
    );
  }

  const expectedCount =
    MANUAL_MODES.length *
    MANUAL_LANGUAGES.length;

  if (
    index.size !== expectedCount
  ) {
    throw new Error(
      `manual_document_count_invalid:${index.size}`
    );
  }

  return index;
}

const DOCUMENT_INDEX =
  createDocumentIndex();

export function getManualDocument({
  mode,
  language,
}) {
  if (
    !MANUAL_MODES.includes(mode) ||
    !MANUAL_LANGUAGES.includes(
      language
    )
  ) {
    return null;
  }

  return (
    DOCUMENT_INDEX.get(
      `${mode}/${language}`
    ) || null
  );
}
