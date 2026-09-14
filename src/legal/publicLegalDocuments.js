const rawModules = import.meta.glob(
  "../../docs/legal/public/*/*/*.md",
  {
    query: "?raw",
    import: "default",
    eager: true,
  }
);

export const PUBLIC_LEGAL_DOCUMENT_SETS =
  Object.freeze([
    "irlava-20",
  ]);

export const PUBLIC_LEGAL_DOCUMENT_SLUGS =
  Object.freeze([
    "privacy-notice",
    "device-storage-notice",
    "operator-information",
    "user-rules",
  ]);

export const PUBLIC_LEGAL_LANGUAGES =
  Object.freeze([
    "lv",
    "en",
    "ru",
  ]);

export const PUBLIC_LEGAL_TOKENS =
  Object.freeze([
    "controller_name",
    "registration_number",
    "legal_address",
    "property_address",
    "support_email",
    "support_phone",
  ]);

const EXPECTED_DOCUMENT_IDS =
  Object.freeze({
    "privacy-notice":
      "PUB-PRIV-01",
    "device-storage-notice":
      "PUB-DEV-01",
    "operator-information":
      "PUB-OP-01",
    "user-rules":
      "PUB-RULES-01",
  });

const TOKEN_PATTERN =
  /\{\{([a-z_]+)\}\}/g;

const PATH_PATTERN =
  /\/docs\/legal\/public\/([^/]+)\/([^/]+)\/([^/]+)\.md$/;

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
        trimmed.startsWith("'") &&
        trimmed.endsWith("'")
      ) ||
      (
        trimmed.startsWith('"') &&
        trimmed.endsWith('"')
      )
    )
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseLegalFrontmatter(
  source
) {
  if (
    typeof source !== "string" ||
    !source.startsWith("---\n")
  ) {
    throw new Error(
      "legal_frontmatter_opening_missing"
    );
  }

  const end =
    source.indexOf(
      "\n---\n",
      4
    );

  if (end === -1) {
    throw new Error(
      "legal_frontmatter_closing_missing"
    );
  }

  const frontmatterSource =
    source.slice(
      4,
      end
    );

  const body =
    source.slice(
      end + 5
    );

  const metadata = {};

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
        "legal_frontmatter_line_invalid"
      );
    }

    const key =
      line
        .slice(0, separator)
        .trim();

    const value =
      line
        .slice(separator + 1);

    if (
      !/^[a-z][a-z0-9_]*$/.test(
        key
      )
    ) {
      throw new Error(
        "legal_frontmatter_key_invalid"
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
        "legal_frontmatter_key_duplicate"
      );
    }

    metadata[key] =
      parseScalar(value);
  }

  return {
    metadata,
    body,
  };
}

function assertAllowedValue(
  value,
  allowed,
  errorCode
) {
  if (!allowed.includes(value)) {
    throw new Error(errorCode);
  }
}

function getTokens(text) {
  const tokens =
    new Set();

  for (
    const match
    of String(text).matchAll(
      TOKEN_PATTERN
    )
  ) {
    tokens.add(
      match[1]
    );
  }

  return tokens;
}

function assertAllowedTokens(text) {
  const allowed =
    new Set(
      PUBLIC_LEGAL_TOKENS
    );

  for (
    const token
    of getTokens(text)
  ) {
    if (!allowed.has(token)) {
      throw new Error(
        `legal_token_not_allowed:${token}`
      );
    }
  }
}

function validateTemplate(
  template
) {
  const {
    documentSetKey,
    documentSlug,
    language,
    metadata,
    body,
  } = template;

  assertAllowedValue(
    documentSetKey,
    PUBLIC_LEGAL_DOCUMENT_SETS,
    "legal_document_set_not_allowed"
  );

  assertAllowedValue(
    documentSlug,
    PUBLIC_LEGAL_DOCUMENT_SLUGS,
    "legal_document_slug_not_allowed"
  );

  assertAllowedValue(
    language,
    PUBLIC_LEGAL_LANGUAGES,
    "legal_document_language_not_allowed"
  );

  const requiredFields = [
    "document_id",
    "version",
    "language",
    "translation_of",
    "status",
    "effective_from",
    "last_reviewed",
    "controller",
    "public",
    "requires_acceptance",
  ];

  for (
    const field
    of requiredFields
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
        `legal_frontmatter_missing:${field}`
      );
    }
  }

  if (
    metadata.document_id !==
    EXPECTED_DOCUMENT_IDS[
      documentSlug
    ]
  ) {
    throw new Error(
      "legal_document_id_mismatch"
    );
  }

  if (
    metadata.language !==
    language
  ) {
    throw new Error(
      "legal_language_mismatch"
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
      "legal_translation_contract_invalid"
    );
  }

  if (
    metadata.status !==
    "approved-for-v0.0"
  ) {
    throw new Error(
      "legal_status_invalid"
    );
  }

  if (
    metadata.public !==
    true
  ) {
    throw new Error(
      "legal_public_flag_invalid"
    );
  }

  if (
    metadata.requires_acceptance !==
    false
  ) {
    throw new Error(
      "legal_acceptance_flag_invalid"
    );
  }

  if (
    metadata.controller !==
    "{{controller_name}}"
  ) {
    throw new Error(
      "legal_controller_token_invalid"
    );
  }

  assertAllowedTokens(body);
  assertAllowedTokens(
    JSON.stringify(metadata)
  );
}

function createTemplateIndex() {
  const index =
    new Map();

  for (
    const [
      modulePath,
      source,
    ]
    of Object.entries(
      rawModules
    )
  ) {
    if (
      typeof source !==
      "string"
    ) {
      throw new Error(
        "legal_markdown_import_invalid"
      );
    }

    const match =
      modulePath.match(
        PATH_PATTERN
      );

    if (!match) {
      throw new Error(
        "legal_markdown_path_invalid"
      );
    }

    const [
      ,
      documentSetKey,
      documentSlug,
      language,
    ] = match;

    const {
      metadata,
      body,
    } =
      parseLegalFrontmatter(
        source
      );

    const template = {
      documentSetKey,
      documentSlug,
      language,
      metadata:
        Object.freeze({
          ...metadata,
        }),
      body,
    };

    validateTemplate(
      template
    );

    const key =
      [
        documentSetKey,
        documentSlug,
        language,
      ].join("/");

    if (index.has(key)) {
      throw new Error(
        "legal_document_duplicate"
      );
    }

    index.set(
      key,
      Object.freeze(
        template
      )
    );
  }

  const expectedCount =
    PUBLIC_LEGAL_DOCUMENT_SETS.length *
    PUBLIC_LEGAL_DOCUMENT_SLUGS.length *
    PUBLIC_LEGAL_LANGUAGES.length;

  if (
    index.size !==
    expectedCount
  ) {
    throw new Error(
      `legal_document_count_invalid:${index.size}`
    );
  }

  return index;
}

const TEMPLATE_INDEX =
  createTemplateIndex();

function buildRuntimeValues({
  facility,
  publicContact,
}) {
  const controllerName =
    facility?.legal_name ||
    facility?.display_name ||
    "";

  const propertyAddress =
    [
      facility?.address_line,
      facility?.city,
    ]
      .map(
        (value) =>
          String(
            value ?? ""
          ).trim()
      )
      .filter(Boolean)
      .join(", ");

  return {
    controller_name:
      String(
        controllerName
      ).trim(),

    registration_number:
      String(
        facility
          ?.registration_number ??
        ""
      ).trim(),

    legal_address:
      String(
        facility
          ?.legal_address ??
        ""
      ).trim(),

    property_address:
      propertyAddress,

    support_email:
      String(
        publicContact
          ?.support_email ??
        ""
      ).trim(),

    support_phone:
      String(
        publicContact
          ?.support_phone ??
        ""
      ).trim(),
  };
}

function substituteTokens(
  text,
  values
) {
  const source =
    String(text ?? "");

  const requiredTokens =
    getTokens(source);

  const missingTokens =
    [];

  for (
    const token
    of requiredTokens
  ) {
    if (
      !PUBLIC_LEGAL_TOKENS
        .includes(token)
    ) {
      throw new Error(
        `legal_token_not_allowed:${token}`
      );
    }

    if (
      !String(
        values[token] ??
        ""
      ).trim()
    ) {
      missingTokens.push(
        token
      );
    }
  }

  if (
    missingTokens.length
  ) {
    throw new Error(
      `legal_runtime_value_missing:${missingTokens.sort().join(",")}`
    );
  }

  const rendered =
    source.replace(
      TOKEN_PATTERN,
      (
        _match,
        token
      ) =>
        values[token]
    );

  if (
    TOKEN_PATTERN.test(
      rendered
    )
  ) {
    TOKEN_PATTERN.lastIndex = 0;

    throw new Error(
      "legal_unresolved_token"
    );
  }

  TOKEN_PATTERN.lastIndex = 0;

  return rendered;
}

export function getPublicLegalDocument({
  documentSetKey,
  documentSlug,
  language,
  facility,
  publicContact,
}) {
  assertAllowedValue(
    documentSetKey,
    PUBLIC_LEGAL_DOCUMENT_SETS,
    "legal_document_set_not_allowed"
  );

  assertAllowedValue(
    documentSlug,
    PUBLIC_LEGAL_DOCUMENT_SLUGS,
    "legal_document_slug_not_allowed"
  );

  assertAllowedValue(
    language,
    PUBLIC_LEGAL_LANGUAGES,
    "legal_document_language_not_allowed"
  );

  const key =
    [
      documentSetKey,
      documentSlug,
      language,
    ].join("/");

  const template =
    TEMPLATE_INDEX.get(key);

  if (!template) {
    throw new Error(
      "legal_document_not_found"
    );
  }

  const runtimeValues =
    buildRuntimeValues({
      facility,
      publicContact,
    });

  const metadata = {};

  for (
    const [
      metadataKey,
      metadataValue,
    ]
    of Object.entries(
      template.metadata
    )
  ) {
    metadata[
      metadataKey
    ] =
      typeof metadataValue ===
      "string"
        ? substituteTokens(
            metadataValue,
            runtimeValues
          )
        : metadataValue;
  }

  const body =
    substituteTokens(
      template.body,
      runtimeValues
    );

  return Object.freeze({
    documentSetKey,
    documentSlug,
    language,
    metadata:
      Object.freeze(
        metadata
      ),
    body,
  });
}

export function getPublicLegalDocumentSummary() {
  return Object.freeze({
    documentSets:
      PUBLIC_LEGAL_DOCUMENT_SETS,
    documentSlugs:
      PUBLIC_LEGAL_DOCUMENT_SLUGS,
    languages:
      PUBLIC_LEGAL_LANGUAGES,
    documentCount:
      TEMPLATE_INDEX.size,
  });
}
