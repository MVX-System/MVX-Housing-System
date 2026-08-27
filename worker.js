export default {
  async fetch(request, env, ctx) {
    return await App.handle(request, env);
  },

  // Stage 2I-SR12:
  // Daily retention housekeeping is executed only by Cloudflare Cron.
  // It is intentionally not tied to normal user requests.
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      SecurityHousekeeping.run(env)
    );
  }
};

// =========================
// APP CORE
// =========================
class App {
static async handle(request, env) {
  const url = new URL(request.url);
  const cors = this.cors(request);

  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const ctx = { request, env, url, cors };

    const route = await Router.match(ctx);

    if (!route) {
      return this.json({ error: "not found" }, 404, cors);
    }

    try {
      const result = await route.handler(ctx);

      // Stage 2I-SR6:
      // Admin handlers historically return "forbidden" for both
      // authentication failure and insufficient role.
      // Resolve the distinction centrally, and only on failed
      // admin requests, so successful requests are unaffected.
      if (
        this.isAdminProtectedPath(
          url.pathname
        )
      ) {
        const isForbiddenResponse =
          result instanceof Response &&
          result.status === 403;

        const isForbiddenObject =
          !(result instanceof Response) &&
          result &&
          typeof result === "object" &&
          !Array.isArray(result) &&
          result.error === "forbidden";

        if (
          isForbiddenResponse ||
          isForbiddenObject
        ) {
          const authenticatedUser =
            await Auth.user(ctx);

          if (!authenticatedUser) {
            return this.json(
              {
                error: "unauthorized"
              },
              401,
              cors
            );
          }
        }
      }

      // If handler returned a Response, preserve it as-is.
      if (result instanceof Response) return result;

      return this.json(
        result,
        this.statusForResult(result),
        cors
      );

    } catch (e) {
      const requestId =
        this.requestId(request);

      this.logError(
        "route_error",
        e,
        {
          path: url.pathname,
          request_id: requestId,
        }
      );

      return this.json(
        {
          error: "route_error",
          request_id: requestId,
        },
        500,
        cors
      );
    }

  } catch (e) {
    const requestId =
      this.requestId(request);

    this.logError(
      "fatal_error",
      e,
      {
        request_id: requestId,
      }
    );

    return this.json(
      {
        error: "internal_error",
        request_id: requestId,
      },
      500,
      cors
    );
  }
}

  static requestId(
    request
  ) {
    return (
      request?.headers?.get(
        "cf-ray"
      ) ||
      crypto.randomUUID()
    );
  }

  static logError(
    event,
    error,
    details = {}
  ) {
    console.error(
      JSON.stringify({
        event:
          String(event || "error"),
        error_name:
          String(
            error?.name ||
            "Error"
          ),
        ...details,
      })
    );
  }

  static isAdminProtectedPath(
    pathname
  ) {
    return (
      String(pathname || "")
        .startsWith(
          "/api/admin/"
        ) ||
      pathname ===
        "/api/apartments/full"
    );
  }

  // =========================
  // RESPONSE
  // Stage 2I-SR6:
  // - authentication failures use HTTP 401
  // - authorization failures use HTTP 403
  // - API JSON responses are non-cacheable and hardened
  // =========================
  static statusForResult(data) {
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      !data.error
    ) {
      return 200;
    }

    if (data.error === "unauthorized") {
      return 401;
    }

    if (data.error === "forbidden") {
      return 403;
    }

    if (data.error === "rate_limited") {
      return 429;
    }

    if (data.error === "login_crash") {
      return 500;
    }

    // Preserve existing application semantics for all other
    // business errors during SR6. They can be classified
    // separately without changing frontend behavior in bulk.
    return 200;
  }

  static json(data, status, cors) {
    const headers = {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control":
        "no-store",
      "X-Content-Type-Options":
        "nosniff",
      "Referrer-Policy":
        "no-referrer",
      "X-Frame-Options":
        "DENY",
      ...cors,
    };

    if (status === 401) {
      headers["WWW-Authenticate"] =
        'Bearer realm="MVX API"';
    }

    if (
      status === 429 &&
      data &&
      typeof data === "object" &&
      Number.isFinite(
        Number(
          data.retry_after_seconds
        )
      )
    ) {
      headers["Retry-After"] =
        String(
          Math.max(
            1,
            Math.ceil(
              Number(
                data.retry_after_seconds
              )
            )
          )
        );
    }

    return new Response(
      JSON.stringify(data),
      {
        status,
        headers,
      }
    );
  }

  static cors(request) {
    const allowedOrigins = new Set([
      "https://mvx-housing-system.pages.dev",
      "https://mvx-housing-system-migration.pages.dev",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);

    const origin =
      request?.headers?.get("Origin") || "";

    const headers = {
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
    };

    if (allowedOrigins.has(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }

    return headers;
  }
}

// =========================
// PII CRYPTO COMPATIBILITY LAYER
// Stage 2: helpers only. No existing application flow uses these yet.
// =========================
class PiiCrypto {
  static VERSION = "v1";

  static normalizeEmail(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  static bytesToBase64Url(bytes) {
    let binary = "";

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  static base64UrlToBytes(value) {
    const normalized = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padding =
      "=".repeat((4 - (normalized.length % 4)) % 4);

    const binary = atob(normalized + padding);

    return Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0)
    );
  }

  static base64ToBytes(value) {
    const normalized = String(value || "")
      .trim()
      .replace(/\s+/g, "");

    if (!normalized) {
      throw new Error("missing_crypto_key");
    }

    const binary = atob(normalized);

    return Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0)
    );
  }

  static async importEncryptionKey(secret) {
    const keyBytes = this.base64ToBytes(secret);

    if (keyBytes.byteLength !== 32) {
      throw new Error("invalid_pii_encryption_key_length");
    }

    return await crypto.subtle.importKey(
      "raw",
      keyBytes,
      {
        name: "AES-GCM",
      },
      false,
      [
        "encrypt",
        "decrypt",
      ]
    );
  }

  static async importHmacKey(secret) {
    const keyBytes = this.base64ToBytes(secret);

    if (keyBytes.byteLength !== 32) {
      throw new Error("invalid_pii_hmac_key_length");
    }

    return await crypto.subtle.importKey(
      "raw",
      keyBytes,
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      [
        "sign",
        "verify",
      ]
    );
  }

  static async encryptText(value, env) {
    if (value === null || value === undefined) {
      return null;
    }

    if (!env?.PII_ENCRYPTION_KEY) {
      throw new Error("missing_pii_encryption_key");
    }

    const plaintext =
      new TextEncoder().encode(String(value));

    const iv =
      crypto.getRandomValues(
        new Uint8Array(12)
      );

    const key =
      await this.importEncryptionKey(
        env.PII_ENCRYPTION_KEY
      );

    const ciphertext =
      new Uint8Array(
        await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv,
            tagLength: 128,
          },
          key,
          plaintext
        )
      );

    return [
      this.VERSION,
      this.bytesToBase64Url(iv),
      this.bytesToBase64Url(ciphertext),
    ].join(".");
  }

  static async decryptText(payload, env) {
    if (payload === null || payload === undefined) {
      return null;
    }

    if (!env?.PII_ENCRYPTION_KEY) {
      throw new Error("missing_pii_encryption_key");
    }

    const parts = String(payload).split(".");

    if (
      parts.length !== 3 ||
      parts[0] !== this.VERSION
    ) {
      throw new Error("invalid_pii_ciphertext_format");
    }

    const iv =
      this.base64UrlToBytes(parts[1]);

    if (iv.byteLength !== 12) {
      throw new Error("invalid_pii_iv_length");
    }

    const ciphertext =
      this.base64UrlToBytes(parts[2]);

    const key =
      await this.importEncryptionKey(
        env.PII_ENCRYPTION_KEY
      );

    const plaintext =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          tagLength: 128,
        },
        key,
        ciphertext
      );

    return new TextDecoder().decode(plaintext);
  }

  static async emailHmac(email, env) {
    if (!env?.PII_HMAC_KEY) {
      throw new Error("missing_pii_hmac_key");
    }

    const normalized =
      this.normalizeEmail(email);

    if (!normalized) {
      return null;
    }

    const key =
      await this.importHmacKey(
        env.PII_HMAC_KEY
      );

    const signature =
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(normalized)
        )
      );

    return [
      this.VERSION,
      this.bytesToBase64Url(signature),
    ].join(".");
  }

  static async searchTokenHmac(
    field,
    token,
    env
  ) {
    if (!env?.PII_HMAC_KEY) {
      throw new Error(
        "missing_pii_hmac_key"
      );
    }

    const normalizedField =
      String(field || "")
        .trim()
        .toLowerCase();

    const normalizedToken =
      String(token || "");

    if (
      !normalizedField ||
      !normalizedToken
    ) {
      return null;
    }

    const key =
      await this.importHmacKey(
        env.PII_HMAC_KEY
      );

    const signature =
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(
            `pii-search:${normalizedField}:${normalizedToken}`
          )
        )
      );

    return [
      this.VERSION,
      this.bytesToBase64Url(signature),
    ].join(".");
  }
}


// =========================
// PII SEARCH TOKEN INDEX
// Stage 2I-5A3B:
// Derived HMAC bigram tokens only.
// No plaintext PII is stored in the search index.
// =========================
class PiiSearch {
  static normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  static normalizePhone(value) {
    return String(value ?? "")
      .replace(/\D+/g, "");
  }

  static bigrams(value) {
    const normalized =
      String(value || "");

    if (normalized.length < 2) {
      return [];
    }

    const tokens =
      new Set();

    for (
      let index = 0;
      index < normalized.length - 1;
      index += 1
    ) {
      tokens.add(
        normalized.slice(
          index,
          index + 2
        )
      );
    }

    return Array.from(tokens);
  }

  static async buildUserTokens(
    {
      firstName,
      lastName,
      email,
      phone,
    },
    env
  ) {
    const name =
      this.normalizeText(
        [
          firstName,
          lastName,
        ]
          .filter(Boolean)
          .join(" ")
      );

    const normalizedEmail =
      PiiCrypto.normalizeEmail(
        email
      );

    const normalizedPhone =
      this.normalizePhone(
        phone
      );

    const sourceByField = {
      name,
      email:
        normalizedEmail,
      phone:
        normalizedPhone,
    };

    const entries = [];

    for (
      const [
        field,
        source,
      ] of Object.entries(
        sourceByField
      )
    ) {
      for (
        const token of
          this.bigrams(source)
      ) {
        const tokenHmac =
          await PiiCrypto.searchTokenHmac(
            field,
            token,
            env
          );

        if (tokenHmac) {
          entries.push({
            field,
            tokenHmac,
          });
        }
      }
    }

    return entries;
  }

  // =========================
  // Stage 2I-5A3C:
  // HMAC search lookup.
  // Query plaintext exists only in Worker memory.
  // PII_DB receives deterministic HMAC bigrams only.
  // =========================
  static normalizeSearchQuery(value) {
    const query =
      String(value ?? "").trim();

    if (!query) {
      return {
        ok: false,
        error: "missing_search_query",
      };
    }

    if (query.length > 128) {
      return {
        ok: false,
        error: "search_query_too_long",
      };
    }

    const text =
      this.normalizeText(query);

    const email =
      PiiCrypto.normalizeEmail(
        query
      );

    const phoneLike =
      /^[+\d\s().-]+$/.test(
        query
      );

    const phone =
      phoneLike
        ? this.normalizePhone(
            query
          )
        : "";

    const usable =
      Math.max(
        text.length,
        email.length,
        phone.length
      ) >= 2;

    if (!usable) {
      return {
        ok: false,
        error: "search_query_too_short",
      };
    }

    return {
      ok: true,
      raw: query,
      text,
      email,
      phone,
      phoneLike,
    };
  }

  static async findCandidateUserIds(
    query,
    env
  ) {
    if (!env?.PII_DB) {
      throw new Error(
        "missing_pii_database"
      );
    }

    const normalized =
      this.normalizeSearchQuery(
        query
      );

    if (!normalized.ok) {
      return normalized;
    }

    const sourceByField = {
      name:
        normalized.text,
      email:
        normalized.email,
      phone:
        normalized.phoneLike
          ? normalized.phone
          : "",
    };

    const candidateIds =
      new Set();

    for (
      const [
        field,
        source,
      ] of Object.entries(
        sourceByField
      )
    ) {
      const tokens =
        this.bigrams(source);

      if (tokens.length === 0) {
        continue;
      }

      const tokenHmacs = [];

      for (const token of tokens) {
        const tokenHmac =
          await PiiCrypto.searchTokenHmac(
            field,
            token,
            env
          );

        if (tokenHmac) {
          tokenHmacs.push(
            tokenHmac
          );
        }
      }

      if (tokenHmacs.length === 0) {
        continue;
      }

      const placeholders =
        tokenHmacs
          .map(() => "?")
          .join(", ");

      const result =
        await env.PII_DB.prepare(`
          SELECT user_id
          FROM pii_search_tokens
          WHERE field = ?
            AND token_hmac IN (
              ${placeholders}
            )
          GROUP BY user_id
          HAVING COUNT(
            DISTINCT token_hmac
          ) = ?
          ORDER BY user_id
          LIMIT 100
        `)
          .bind(
            field,
            ...tokenHmacs,
            tokenHmacs.length
          )
          .all();

      for (
        const row of
        result.results || []
      ) {
        const userId =
          Number(row.user_id);

        if (
          Number.isInteger(userId) &&
          userId > 0
        ) {
          candidateIds.add(
            userId
          );
        }
      }
    }

    return {
      ok: true,
      normalized,
      user_ids:
        Array.from(
          candidateIds
        ),
    };
  }

  static matchesPlaintext(
    pii,
    normalized
  ) {
    const name =
      this.normalizeText(
        [
          pii?.first_name,
          pii?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
      );

    const email =
      PiiCrypto.normalizeEmail(
        pii?.email
      );

    const phone =
      this.normalizePhone(
        pii?.phone
      );

    const nameMatch =
      normalized.text.length >= 2 &&
      name.includes(
        normalized.text
      );

    const emailMatch =
      normalized.email.length >= 2 &&
      email.includes(
        normalized.email
      );

    const phoneMatch =
      normalized.phoneLike &&
      normalized.phone.length >= 2 &&
      phone.includes(
        normalized.phone
      );

    return (
      nameMatch ||
      emailMatch ||
      phoneMatch
    );
  }
}

// =========================
// PII STORE - DUAL READ SUPPORT
// Stage 2C: reads encrypted PII from PII_DB.
// Callers may fall back to Main D1 while migration is being verified.
// =========================
class PiiStore {
  static async getUserPii(userId, env) {
    if (!env?.PII_DB) {
      return null;
    }

    const row =
      await env.PII_DB.prepare(`
        SELECT
          user_id,
          first_name_enc,
          last_name_enc,
          email_enc,
          phone_enc
        FROM user_pii
        WHERE user_id = ?
      `)
        .bind(userId)
        .first();

    if (!row) {
      return null;
    }

    return {
      user_id: row.user_id,
      first_name:
        await PiiCrypto.decryptText(
          row.first_name_enc,
          env
        ),
      last_name:
        await PiiCrypto.decryptText(
          row.last_name_enc,
          env
        ),
      email:
        await PiiCrypto.decryptText(
          row.email_enc,
          env
        ),
      phone:
        row.phone_enc === null
          ? null
          : await PiiCrypto.decryptText(
              row.phone_enc,
              env
            ),
    };
  }

  static async getUsersPii(
    userIds,
    env
  ) {
    if (!env?.PII_DB) {
      return new Map();
    }

    const ids =
      Array.from(
        new Set(
          (Array.isArray(userIds)
            ? userIds
            : []
          )
            .map(Number)
            .filter(
              (value) =>
                Number.isInteger(value) &&
                value > 0
            )
        )
      );

    if (ids.length === 0) {
      return new Map();
    }

    const placeholders =
      ids
        .map(() => "?")
        .join(", ");

    const result =
      await env.PII_DB.prepare(`
        SELECT
          user_id,
          first_name_enc,
          last_name_enc,
          email_enc,
          phone_enc
        FROM user_pii
        WHERE user_id IN (
          ${placeholders}
        )
      `)
        .bind(...ids)
        .all();

    const piiMap =
      new Map();

    for (
      const row of
        result.results || []
    ) {
      piiMap.set(
        Number(row.user_id),
        {
          user_id:
            Number(row.user_id),

          first_name:
            await PiiCrypto.decryptText(
              row.first_name_enc,
              env
            ),

          last_name:
            await PiiCrypto.decryptText(
              row.last_name_enc,
              env
            ),

          email:
            await PiiCrypto.decryptText(
              row.email_enc,
              env
            ),

          phone:
            row.phone_enc === null
              ? null
              : await PiiCrypto.decryptText(
                  row.phone_enc,
                  env
                ),
        }
      );
    }

    return piiMap;
  }

  // Stage 2H-1:
  // Resolve email uniqueness through deterministic HMAC in PII_DB.
  // Plaintext email is never required in Main D1.
  static async findUserIdByEmail(
    email,
    env
  ) {
    if (!env?.PII_DB) {
      throw new Error(
        "missing_pii_database"
      );
    }

    const emailHmac =
      await PiiCrypto.emailHmac(
        email,
        env
      );

    if (!emailHmac) {
      return null;
    }

    const row =
      await env.PII_DB.prepare(`
        SELECT user_id
        FROM user_pii
        WHERE email_hmac = ?
        LIMIT 1
      `)
        .bind(emailHmac)
        .first();

    if (!row) {
      return null;
    }

    const userId =
      Number(row.user_id);

    return Number.isInteger(userId)
      && userId > 0
      ? userId
      : null;
  }

  // Stage 2H-1:
  // Stores encrypted PII only in the dedicated PII database.
  static async upsertUserPii(
    {
      userId,
      firstName,
      lastName,
      email,
      phone,
      createdAt = null,
      updatedAt = null,
    },
    env
  ) {
    if (!env?.PII_DB) {
      throw new Error(
        "missing_pii_database"
      );
    }

    const normalizedUserId =
      Number(userId);

    if (
      !Number.isInteger(
        normalizedUserId
      ) ||
      normalizedUserId <= 0
    ) {
      throw new Error(
        "invalid_pii_user_id"
      );
    }

    const normalizedFirstName =
      String(
        firstName ?? ""
      ).trim();

    const normalizedLastName =
      String(
        lastName ?? ""
      ).trim();

    const normalizedEmail =
      PiiCrypto.normalizeEmail(
        email
      );

    const normalizedPhone =
      String(
        phone ?? ""
      ).trim();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail
    ) {
      throw new Error(
        "missing_required_pii_fields"
      );
    }

    const firstNameEnc =
      await PiiCrypto.encryptText(
        normalizedFirstName,
        env
      );

    const lastNameEnc =
      await PiiCrypto.encryptText(
        normalizedLastName,
        env
      );

    const emailEnc =
      await PiiCrypto.encryptText(
        normalizedEmail,
        env
      );

    const phoneEnc =
      normalizedPhone
        ? await PiiCrypto.encryptText(
            normalizedPhone,
            env
          )
        : null;

    const emailHmac =
      await PiiCrypto.emailHmac(
        normalizedEmail,
        env
      );

    const nowIso =
      updatedAt ||
      new Date().toISOString();

    const createdIso =
      createdAt ||
      nowIso;

    const searchTokens =
      await PiiSearch.buildUserTokens(
        {
          firstName:
            normalizedFirstName,
          lastName:
            normalizedLastName,
          email:
            normalizedEmail,
          phone:
            normalizedPhone,
        },
        env
      );

    const statements = [
      env.PII_DB.prepare(`
        INSERT INTO user_pii (
          user_id,
          first_name_enc,
          last_name_enc,
          email_enc,
          phone_enc,
          email_hmac,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          first_name_enc =
            excluded.first_name_enc,
          last_name_enc =
            excluded.last_name_enc,
          email_enc =
            excluded.email_enc,
          phone_enc =
            excluded.phone_enc,
          email_hmac =
            excluded.email_hmac,
          updated_at =
            excluded.updated_at
      `)
        .bind(
          normalizedUserId,
          firstNameEnc,
          lastNameEnc,
          emailEnc,
          phoneEnc,
          emailHmac,
          createdIso,
          nowIso
        ),

      env.PII_DB.prepare(`
        DELETE FROM pii_search_tokens
        WHERE user_id = ?
      `)
        .bind(
          normalizedUserId
        ),

      ...searchTokens.map(
        ({
          field,
          tokenHmac,
        }) =>
          env.PII_DB.prepare(`
            INSERT INTO pii_search_tokens (
              user_id,
              field,
              token_hmac
            )
            VALUES (?, ?, ?)
          `)
            .bind(
              normalizedUserId,
              field,
              tokenHmac
            )
      ),
    ];

    await env.PII_DB.batch(
      statements
    );

    return {
      ok: true,
      user_id:
        normalizedUserId,
    };
  }
}

// =========================
// ROUTER
// =========================

// =========================
// PII ACCESS AUDIT
// Stage 2I-3B: infrastructure only.
// Routes are not connected to audit yet.
// =========================
class PiiAudit {
  static normalizePositiveInteger(
    value,
    { allowNull = false } = {}
  ) {
    if (
      allowNull &&
      (value === null || value === undefined)
    ) {
      return null;
    }

    const normalized = Number(value);

    if (
      !Number.isInteger(normalized) ||
      normalized <= 0
    ) {
      throw new Error(
        "invalid_pii_audit_integer"
      );
    }

    return normalized;
  }

  static normalizeFields(value) {
    const fields =
      Array.isArray(value)
        ? value
        : String(value || "")
            .split(",");

    const normalized =
      Array.from(
        new Set(
          fields
            .map(
              (field) =>
                String(field || "")
                  .trim()
            )
            .filter(Boolean)
        )
      );

    if (normalized.length === 0) {
      throw new Error(
        "missing_pii_audit_fields"
      );
    }

    return normalized.join(",");
  }

  static normalizeText(
    value,
    errorCode
  ) {
    const normalized =
      String(value || "").trim();

    if (!normalized) {
      throw new Error(errorCode);
    }

    return normalized;
  }

  static async record(
    {
      actorUserId,
      subjectUserId = null,
      action,
      endpoint,
      fields,
      subjectCount = null,
    },
    env
  ) {
    if (!env?.PII_DB) {
      throw new Error(
        "missing_pii_database"
      );
    }

    const normalizedActorUserId =
      this.normalizePositiveInteger(
        actorUserId
      );

    const normalizedSubjectUserId =
      this.normalizePositiveInteger(
        subjectUserId,
        {
          allowNull: true,
        }
      );

    const normalizedAction =
      this.normalizeText(
        action,
        "missing_pii_audit_action"
      );

    const normalizedEndpoint =
      this.normalizeText(
        endpoint,
        "missing_pii_audit_endpoint"
      );

    const normalizedFields =
      this.normalizeFields(fields);

    let normalizedSubjectCount = null;

    if (
      subjectCount !== null &&
      subjectCount !== undefined
    ) {
      normalizedSubjectCount =
        Number(subjectCount);

      if (
        !Number.isInteger(
          normalizedSubjectCount
        ) ||
        normalizedSubjectCount < 0
      ) {
        throw new Error(
          "invalid_pii_audit_subject_count"
        );
      }
    }

    const result =
      await env.PII_DB.prepare(`
        INSERT INTO pii_access_audit (
          actor_user_id,
          subject_user_id,
          action,
          endpoint,
          fields,
          subject_count
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(
          normalizedActorUserId,
          normalizedSubjectUserId,
          normalizedAction,
          normalizedEndpoint,
          normalizedFields,
          normalizedSubjectCount
        )
        .run();

    return {
      ok: true,
      audit_id:
        result?.meta?.last_row_id ??
        null,
    };
  }
}


// =========================
// SECURITY AUDIT LOG
// Stage 2I-SR11:
// Main-D1 audit trail for authentication and critical state changes.
// Never store passwords, JWTs, raw IP addresses, PII, announcement text,
// meter serial numbers, source notes, or other free-form sensitive content.
// =========================
class SecurityAudit {
  static FORBIDDEN_DETAIL_KEY =
    /(password|token|secret|email|phone|first_name|last_name|personal_code|ip|endpoint|content|title|serial|source_note|reason)/i;

  static normalizeText(
    value,
    {
      allowNull = true,
      maxLength = 160,
    } = {}
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      if (allowNull) {
        return null;
      }

      throw new Error(
        "missing_security_audit_text"
      );
    }

    const normalized =
      String(value).trim();

    if (
      !normalized ||
      normalized.length >
        maxLength
    ) {
      throw new Error(
        "invalid_security_audit_text"
      );
    }

    return normalized;
  }

  static sanitizeDetails(
    details
  ) {
    if (
      details === null ||
      details === undefined
    ) {
      return null;
    }

    const walk = (
      value,
      depth = 0
    ) => {
      if (depth > 4) {
        throw new Error(
          "security_audit_details_too_deep"
        );
      }

      if (
        value === null ||
        typeof value ===
          "boolean" ||
        typeof value ===
          "string" ||
        typeof value ===
          "number"
      ) {
        return value;
      }

      if (Array.isArray(value)) {
        if (value.length > 64) {
          throw new Error(
            "security_audit_details_too_large"
          );
        }

        return value.map(
          (item) =>
            walk(
              item,
              depth + 1
            )
        );
      }

      if (
        typeof value === "object"
      ) {
        const result = {};

        for (
          const [
            key,
            item,
          ] of Object.entries(
            value
          )
        ) {
          if (
            this.FORBIDDEN_DETAIL_KEY
              .test(key)
          ) {
            throw new Error(
              "forbidden_security_audit_detail"
            );
          }

          result[key] =
            walk(
              item,
              depth + 1
            );
        }

        return result;
      }

      throw new Error(
        "invalid_security_audit_detail"
      );
    };

    const serialized =
      JSON.stringify(
        walk(details)
      );

    if (
      serialized.length > 2000
    ) {
      throw new Error(
        "security_audit_details_too_large"
      );
    }

    return serialized;
  }

  static async record(
    ctx,
    {
      actorUserId = null,
      action,
      targetType = null,
      targetId = null,
      result = "success",
      details = null,
    }
  ) {
    const normalizedActorUserId =
      actorUserId === null ||
      actorUserId === undefined
        ? null
        : normalizePositiveInteger(
            actorUserId
          );

    if (
      actorUserId !== null &&
      actorUserId !== undefined &&
      !normalizedActorUserId
    ) {
      throw new Error(
        "invalid_security_audit_actor"
      );
    }

    const normalizedAction =
      this.normalizeText(
        action,
        {
          allowNull: false,
          maxLength: 120,
        }
      );

    const normalizedTargetType =
      this.normalizeText(
        targetType,
        {
          allowNull: true,
          maxLength: 80,
        }
      );

    const normalizedTargetId =
      this.normalizeText(
        targetId,
        {
          allowNull: true,
          maxLength: 128,
        }
      );

    const normalizedResult =
      this.normalizeText(
        result,
        {
          allowNull: false,
          maxLength: 40,
        }
      );

    const endpoint =
      this.normalizeText(
        ctx?.url?.pathname,
        {
          allowNull: true,
          maxLength: 240,
        }
      );

    const requestId =
      App.requestId(
        ctx?.request
      );

    const resultRow =
      await ctx.env.DB.prepare(`
        INSERT INTO security_audit_log (
          actor_user_id,
          action,
          target_type,
          target_id,
          endpoint,
          result,
          request_id,
          details
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          normalizedActorUserId,
          normalizedAction,
          normalizedTargetType,
          normalizedTargetId,
          endpoint,
          normalizedResult,
          requestId,
          this.sanitizeDetails(
            details
          )
        )
        .run();

    return {
      ok: true,
      audit_id:
        resultRow?.meta
          ?.last_row_id ??
        null,
    };
  }

  static async recordSafe(
    ctx,
    entry
  ) {
    try {
      return await this.record(
        ctx,
        entry
      );
    } catch (error) {
      App.logError(
        "security_audit_write_error",
        error,
        {
          action:
            String(
              entry?.action || ""
            ).slice(0, 120),
          request_id:
            App.requestId(
              ctx?.request
            ),
        }
      );

      return {
        ok: false
      };
    }
  }
}


// =========================
// SECURITY / DATA RETENTION HOUSEKEEPING
// Stage 2I-SR12
//
// Retention policy:
// - security_rate_limits: 7 days
// - expired/revoked auth_sessions: 30 days
// - push_deliveries: 180 days
// - inactive push_subscriptions: 180 days, only when no delivery rows remain
// - security_audit_log: 730 days
// - pii_access_audit: 730 days
//
// No cleanup is performed from user-facing HTTP requests.
// =========================
class SecurityHousekeeping {
  static async runStep(
    name,
    operation
  ) {
    try {
      const result =
        await operation();

      return {
        name,
        ok: true,
        changes:
          Number(
            result?.meta?.changes ||
            0
          ),
      };
    } catch (error) {
      App.logError(
        "retention_cleanup_error",
        error,
        {
          cleanup_step:
            String(name).slice(
              0,
              80
            ),
        }
      );

      return {
        name,
        ok: false,
        changes: 0,
      };
    }
  }

  static async run(env) {
    const results = [];

    // Short-lived abuse-protection artifacts use Unix epoch seconds.
    results.push(
      await this.runStep(
        "security_rate_limits",
        () =>
          env.DB.prepare(`
            DELETE FROM security_rate_limits
            WHERE updated_at <
              CAST(
                strftime(
                  '%s',
                  'now',
                  '-7 days'
                )
                AS INTEGER
              )
          `).run()
      )
    );

    // Keep expired/revoked server-side sessions for 30 days
    // for short-term operational troubleshooting, then remove them.
    results.push(
      await this.runStep(
        "auth_sessions",
        () =>
          env.DB.prepare(`
            DELETE FROM auth_sessions
            WHERE
              (
                revoked_at IS NOT NULL
                AND datetime(revoked_at) <
                  datetime(
                    'now',
                    '-30 days'
                  )
              )
              OR
              (
                datetime(expires_at) <
                  datetime(
                    'now',
                    '-30 days'
                  )
              )
          `).run()
      )
    );

    // Delivery history must be removed before stale subscriptions
    // because push_deliveries has a NO ACTION FK to push_subscriptions.
    results.push(
      await this.runStep(
        "push_deliveries",
        () =>
          env.DB.prepare(`
            DELETE FROM push_deliveries
            WHERE datetime(created_at) <
              datetime(
                'now',
                '-180 days'
              )
          `).run()
      )
    );

    // Remove only inactive subscriptions that are old enough and
    // no longer referenced by any remaining delivery history.
    results.push(
      await this.runStep(
        "push_subscriptions",
        () =>
          env.DB.prepare(`
            DELETE FROM push_subscriptions
            WHERE is_active = 0
              AND datetime(updated_at) <
                datetime(
                  'now',
                  '-180 days'
                )
              AND NOT EXISTS (
                SELECT 1
                FROM push_deliveries pd
                WHERE
                  pd.subscription_id =
                    push_subscriptions.id
              )
          `).run()
      )
    );

    // Security/admin audit trail: 24 months (730 days).
    results.push(
      await this.runStep(
        "security_audit_log",
        () =>
          env.DB.prepare(`
            DELETE FROM security_audit_log
            WHERE datetime(created_at) <
              datetime(
                'now',
                '-730 days'
              )
          `).run()
      )
    );

    // PII access audit is kept separately in PII_DB,
    // with the same 24-month retention period.
    if (env.PII_DB) {
      results.push(
        await this.runStep(
          "pii_access_audit",
          () =>
            env.PII_DB.prepare(`
              DELETE FROM pii_access_audit
              WHERE datetime(created_at) <
                datetime(
                  'now',
                  '-730 days'
                )
            `).run()
        )
      );
    }

    return {
      ok:
        results.every(
          (item) => item.ok
        ),
      results,
    };
  }
}

class Router {
  static routes = [];

  static register(method, path, handler, guards = []) {
    this.routes.push({ method, path, handler, guards });
  }

  static async match(ctx) {
    const { request, url } = ctx;

    for (const r of this.routes) {
      if (r.method !== request.method) continue;
      if (r.path !== url.pathname) continue;

      // guards
    for (const g of r.guards) {

      const ok = await g(ctx);

      if (!ok) {

        return {
          handler: async () => ({
            error: "forbidden"
          })
        };

      }
    }

      return r;
    }

    return null;
  }
}

// =========================
// AUTH MIDDLEWARE
// Stage 2I-SR2:
// - strict Bearer parsing
// - JWT signature + lifetime validation
// - live user status and role revalidation from Main D1
// =========================
const Auth = {
  async user(ctx) {
    const authHeader =
      String(
        ctx.request.headers.get(
          "Authorization"
        ) || ""
      ).trim();

    const match =
      authHeader.match(
        /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/
      );

    if (!match) {
      return null;
    }

    const token = match[1];

    const tokenPayload =
      await verifyJWT(
        token,
        ctx.env.JWT_SECRET
      );

    if (!tokenPayload) {
      return null;
    }

    const userId =
      Number(
        tokenPayload.user_id
      );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return null;
    }

    const sessionId =
      String(
        tokenPayload.session_id || ""
      ).trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sessionId
      )
    ) {
      return null;
    }

    const session =
      await ctx.env.DB.prepare(`
        SELECT
          session_id,
          user_id,
          expires_at,
          revoked_at
        FROM auth_sessions
        WHERE session_id = ?
          AND user_id = ?
        LIMIT 1
      `)
        .bind(
          sessionId,
          userId
        )
        .first();

    if (
      !session ||
      session.revoked_at ||
      !session.expires_at ||
      Date.parse(
        session.expires_at
      ) <= Date.now()
    ) {
      return null;
    }

    const user =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          nick,
          is_active
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
        .bind(userId)
        .first();

    if (
      !user ||
      Number(user.is_active) !== 1
    ) {
      return null;
    }

    const rolesResult =
      await ctx.env.DB.prepare(`
        SELECT r.name
        FROM roles r
        JOIN user_roles ur
          ON ur.role_id = r.id
        WHERE ur.user_id = ?
        ORDER BY r.name
      `)
        .bind(userId)
        .all();

    return {
      user_id:
        Number(user.id),
      nick:
        user.nick || null,
      roles:
        (rolesResult.results || [])
          .map(
            (row) =>
              String(
                row.name || ""
              ).trim()
          )
          .filter(Boolean),
      iat:
        tokenPayload.iat,
      exp:
        tokenPayload.exp,
      session_id:
        sessionId,
    };
  },

  async requireUser(ctx) {
    const u = await Auth.user(ctx);
    return u || null;
  },

  async requireAdmin(ctx) {
    const u = await Auth.user(ctx);

    if (!u) {
      return null;
    }

    if (
      !u.roles.includes(
        "admin"
      )
    ) {
      return null;
    }

    return u;
  },
};

// =========================
// SECURITY RATE LIMITING
// Stage 2I-SR7:
// D1-backed abuse controls for login, password verification,
// and PII-heavy admin reads. Raw IP addresses and login identifiers
// are never persisted; limiter keys are HMAC-SHA256 pseudonyms.
// =========================
class SecurityRateLimit {
  static TABLE_NAME =
    "security_rate_limits";

  static tableReady = false;
  static maintenanceCounter = 0;

  static nowSeconds() {
    return Math.floor(
      Date.now() / 1000
    );
  }

  static clientIp(request) {
    const cloudflareIp =
      String(
        request?.headers?.get(
          "CF-Connecting-IP"
        ) || ""
      ).trim();

    if (cloudflareIp) {
      return cloudflareIp;
    }

    const forwardedFor =
      String(
        request?.headers?.get(
          "X-Forwarded-For"
        ) || ""
      )
        .split(",")[0]
        .trim();

    return forwardedFor ||
      "unknown-client";
  }

  static normalizeLoginIdentifier(
    value
  ) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  static async ensureTable(env) {
    if (this.tableReady) {
      return;
    }

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS security_rate_limits (
        scope TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        window_started_at INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        blocked_until INTEGER,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (scope, key_hash)
      )
    `).run();

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated_at
      ON security_rate_limits(updated_at)
    `).run();

    this.tableReady = true;
  }

  static async keyHash(
    env,
    scope,
    key
  ) {
    const secret =
      String(
        env?.JWT_SECRET || ""
      );

    if (!secret) {
      throw new Error(
        "missing_rate_limit_secret"
      );
    }

    const cryptoKey =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(
          secret
        ),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );

    const signature =
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          cryptoKey,
          new TextEncoder().encode(
            `mvx-rate-limit:v1:${scope}:${key}`
          )
        )
      );

    return Array.from(
      signature,
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0")
    ).join("");
  }

  static async maybeCleanup(env) {
    this.maintenanceCounter += 1;

    if (
      this.maintenanceCounter %
        128 !==
      1
    ) {
      return;
    }

    const staleBefore =
      this.nowSeconds() -
      7 * 24 * 60 * 60;

    try {
      await env.DB.prepare(`
        DELETE FROM security_rate_limits
        WHERE updated_at < ?
      `)
        .bind(staleBefore)
        .run();
    } catch (error) {
      console.error(
        "RATE LIMIT CLEANUP ERROR:",
        String(
          error?.message || error
        )
      );
    }
  }

  static async row(
    env,
    scope,
    key
  ) {
    await this.ensureTable(env);

    const keyHash =
      await this.keyHash(
        env,
        scope,
        key
      );

    const row =
      await env.DB.prepare(`
        SELECT
          scope,
          key_hash,
          window_started_at,
          attempt_count,
          blocked_until,
          updated_at
        FROM security_rate_limits
        WHERE scope = ?
          AND key_hash = ?
        LIMIT 1
      `)
        .bind(
          scope,
          keyHash
        )
        .first();

    return {
      keyHash,
      row: row || null,
    };
  }

  static blockedResult(
    blockedUntil
  ) {
    const now =
      this.nowSeconds();

    return {
      allowed: false,
      retry_after_seconds:
        Math.max(
          1,
          Number(blockedUntil || 0) -
            now
        ),
    };
  }

  static async check({
    env,
    scope,
    key,
    windowSeconds,
  }) {
    const now =
      this.nowSeconds();

    const {
      keyHash,
      row,
    } = await this.row(
      env,
      scope,
      key
    );

    await this.maybeCleanup(env);

    if (!row) {
      return {
        allowed: true,
        key_hash: keyHash,
      };
    }

    const blockedUntil =
      Number(
        row.blocked_until || 0
      );

    if (blockedUntil > now) {
      return {
        ...this.blockedResult(
          blockedUntil
        ),
        key_hash: keyHash,
      };
    }

    const windowStartedAt =
      Number(
        row.window_started_at || 0
      );

    if (
      now - windowStartedAt >=
      windowSeconds
    ) {
      return {
        allowed: true,
        key_hash: keyHash,
      };
    }

    return {
      allowed: true,
      key_hash: keyHash,
    };
  }

  static async recordFailure({
    env,
    scope,
    key,
    maxAttempts,
    windowSeconds,
    blockSeconds,
  }) {
    const now =
      this.nowSeconds();

    const {
      keyHash,
      row,
    } = await this.row(
      env,
      scope,
      key
    );

    let windowStartedAt = now;
    let attemptCount = 1;

    if (
      row &&
      now -
        Number(
          row.window_started_at || 0
        ) <
        windowSeconds
    ) {
      windowStartedAt =
        Number(
          row.window_started_at
        );

      attemptCount =
        Number(
          row.attempt_count || 0
        ) + 1;
    }

    const blockedUntil =
      attemptCount >= maxAttempts
        ? now + blockSeconds
        : null;

    await env.DB.prepare(`
      INSERT INTO security_rate_limits (
        scope,
        key_hash,
        window_started_at,
        attempt_count,
        blocked_until,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, key_hash)
      DO UPDATE SET
        window_started_at =
          excluded.window_started_at,
        attempt_count =
          excluded.attempt_count,
        blocked_until =
          excluded.blocked_until,
        updated_at =
          excluded.updated_at
    `)
      .bind(
        scope,
        keyHash,
        windowStartedAt,
        attemptCount,
        blockedUntil,
        now
      )
      .run();

    await this.maybeCleanup(env);

    if (blockedUntil) {
      return {
        ...this.blockedResult(
          blockedUntil
        ),
        key_hash: keyHash,
      };
    }

    return {
      allowed: true,
      remaining_attempts:
        Math.max(
          0,
          maxAttempts -
            attemptCount
        ),
      key_hash: keyHash,
    };
  }

  static async consume({
    env,
    scope,
    key,
    maxRequests,
    windowSeconds,
    blockSeconds,
  }) {
    const now =
      this.nowSeconds();

    const {
      keyHash,
      row,
    } = await this.row(
      env,
      scope,
      key
    );

    if (
      row &&
      Number(
        row.blocked_until || 0
      ) > now
    ) {
      return {
        ...this.blockedResult(
          row.blocked_until
        ),
        key_hash: keyHash,
      };
    }

    let windowStartedAt = now;
    let attemptCount = 1;

    if (
      row &&
      now -
        Number(
          row.window_started_at || 0
        ) <
        windowSeconds
    ) {
      windowStartedAt =
        Number(
          row.window_started_at
        );

      attemptCount =
        Number(
          row.attempt_count || 0
        ) + 1;
    }

    const exceeded =
      attemptCount > maxRequests;

    const blockedUntil =
      exceeded
        ? now + blockSeconds
        : null;

    await env.DB.prepare(`
      INSERT INTO security_rate_limits (
        scope,
        key_hash,
        window_started_at,
        attempt_count,
        blocked_until,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, key_hash)
      DO UPDATE SET
        window_started_at =
          excluded.window_started_at,
        attempt_count =
          excluded.attempt_count,
        blocked_until =
          excluded.blocked_until,
        updated_at =
          excluded.updated_at
    `)
      .bind(
        scope,
        keyHash,
        windowStartedAt,
        attemptCount,
        blockedUntil,
        now
      )
      .run();

    await this.maybeCleanup(env);

    if (exceeded) {
      return {
        ...this.blockedResult(
          blockedUntil
        ),
        key_hash: keyHash,
      };
    }

    return {
      allowed: true,
      remaining_requests:
        Math.max(
          0,
          maxRequests -
            attemptCount
        ),
      key_hash: keyHash,
    };
  }

  static async clear({
    env,
    scope,
    key,
  }) {
    await this.ensureTable(env);

    const keyHash =
      await this.keyHash(
        env,
        scope,
        key
      );

    await env.DB.prepare(`
      DELETE FROM security_rate_limits
      WHERE scope = ?
        AND key_hash = ?
    `)
      .bind(
        scope,
        keyHash
      )
      .run();
  }

  static response(result) {
    return {
      error: "rate_limited",
      retry_after_seconds:
        Math.max(
          1,
          Math.ceil(
            Number(
              result?.retry_after_seconds ||
              1
            )
          )
        ),
    };
  }
}

const LOGIN_REQUEST_IP_LIMIT = {
  maxRequests: 60,
  windowSeconds: 60,
  blockSeconds: 5 * 60,
};

const LOGIN_FAILURE_IP_LIMIT = {
  maxAttempts: 30,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};

const LOGIN_FAILURE_ACCOUNT_LIMIT = {
  maxAttempts: 10,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

const PASSWORD_CHANGE_FAILURE_LIMIT = {
  maxAttempts: 10,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

const ADMIN_PII_SEARCH_LIMIT = {
  maxRequests: 120,
  windowSeconds: 5 * 60,
  blockSeconds: 5 * 60,
};

const ADMIN_PII_DETAIL_LIMIT = {
  maxRequests: 120,
  windowSeconds: 5 * 60,
  blockSeconds: 5 * 60,
};

// Stage 2I-SR14F-B:
// Protected restore-request creation is deliberately throttled.
// The first limiter caps all request attempts; the second applies
// specifically to failed administrator password confirmation.
const ADMIN_RESTORE_REQUEST_LIMIT = {
  maxRequests: 10,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

const ADMIN_RESTORE_CANCEL_LIMIT = {
  maxRequests: 30,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};

// Stage 2I-SR14F-C:
// Preview / validation is read-only with respect to Cloudflare D1,
// MEGA and R2, but it writes a validation record to Main D1.
const ADMIN_RESTORE_VALIDATE_LIMIT = {
  maxRequests: 30,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};

// Stage 2I-SR14F-D4:
// Final readiness remains non-destructive, but it persists a signed-off
// pre-restore readiness record in Main D1.
const ADMIN_RESTORE_READINESS_LIMIT = {
  maxRequests: 30,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};

// Stage 2I-SR14F-D5A:
// Final execution arming is still non-destructive, but it is a more
// sensitive control surface because it creates a short-lived one-time
// credential for a later restore-execution phase.
const ADMIN_RESTORE_ARM_LIMIT = {
  maxRequests: 10,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

// Stage 2I-SR14F-D5B-1:
// Token verification dry-run. It never consumes an arm and never starts
// a restore, but repeated guesses against an execution token are rate-limited.
const ADMIN_RESTORE_EXECUTION_DRY_RUN_LIMIT = {
  maxRequests: 10,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

// Stage 2I-SR14F-D5B-2B:
// Final control-plane dispatch is deliberately rare and heavily rate-limited.
// The endpoint consumes the arm and creates a durable execution journal entry,
// but the workflow introduced in D5B-2B remains non-destructive.
const ADMIN_RESTORE_EXECUTION_DISPATCH_LIMIT = {
  maxRequests: 5,
  windowSeconds: 30 * 60,
  blockSeconds: 60 * 60,
};

const ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 15 * 60,
  blockSeconds: 30 * 60,
};

// Fixed PBKDF2 record used only to equalize the expensive password
// verification path for unknown Nick values. It is not a user password.
const LOGIN_DUMMY_PASSWORD_HASH =
  "pbkdf2-sha256$100000$TVZYLVNSNy1kdW1teS1zYQ$6c_K89gSqs7ERauFL6LMzb9xFEK0Kozuw_ERyYy3R8U";

// =========================
// INPUT VALIDATION / DATA INTEGRITY
// Stage 2I-SR8
// =========================
const USER_APARTMENT_RELATION_TYPES =
  new Set([
    "owner",
    "resident",
  ]);

function normalizePositiveInteger(
  value
) {
  const normalized =
    Number(value);

  return (
    Number.isInteger(normalized) &&
    normalized > 0
  )
    ? normalized
    : null;
}

function normalizeIntegerInRange(
  value,
  {
    min,
    max,
    fallback = null,
  }
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const normalized =
    Number(value);

  if (
    !Number.isInteger(normalized) ||
    normalized < min ||
    normalized > max
  ) {
    return null;
  }

  return normalized;
}

function normalizeFiniteNumberInRange(
  value,
  {
    min,
    max,
    fallback = null,
  }
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const normalized =
    Number(value);

  if (
    !Number.isFinite(normalized) ||
    normalized < min ||
    normalized > max
  ) {
    return null;
  }

  return normalized;
}

function normalizeBoundedText(
  value,
  {
    maxLength,
    required = false,
    fallback = "",
  }
) {
  if (
    value === undefined ||
    value === null
  ) {
    return required
      ? null
      : fallback;
  }

  const normalized =
    String(value).trim();

  if (
    required &&
    !normalized
  ) {
    return null;
  }

  if (
    normalized.length >
    maxLength
  ) {
    return null;
  }

  return normalized;
}

function normalizeApartmentPayload(
  body
) {
  const number =
    normalizeBoundedText(
      body?.number,
      {
        maxLength: 32,
        required: true,
      }
    );

  const section =
    normalizeBoundedText(
      body?.section,
      {
        maxLength: 32,
        fallback: "",
      }
    );

  const floor =
    normalizeBoundedText(
      body?.floor,
      {
        maxLength: 32,
        fallback: "",
      }
    );

  const roomCount =
    normalizeIntegerInRange(
      body?.room_count,
      {
        min: 1,
        max: 20,
        fallback: 1,
      }
    );

  // Frontend historically used resident_count.
  // Main D1 column is residents_count.
  const residentsCountSource =
    body?.residents_count ??
    body?.resident_count;

  const residentsCount =
    normalizeIntegerInRange(
      residentsCountSource,
      {
        min: 0,
        max: 50,
        fallback: 0,
      }
    );

  const levelCount =
    normalizeIntegerInRange(
      body?.level_count,
      {
        min: 1,
        max: 10,
        fallback: 1,
      }
    );

  const hotWaterRiserCount =
    normalizeIntegerInRange(
      body?.hot_water_riser_count,
      {
        min: 0,
        max: 20,
        fallback: 0,
      }
    );

  const livingArea =
    normalizeFiniteNumberInRange(
      body?.living_area,
      {
        min: 0,
        max: 10000,
        fallback: 0,
      }
    );

  const nonLivingArea =
    normalizeFiniteNumberInRange(
      body?.non_living_area,
      {
        min: 0,
        max: 10000,
        fallback: 0,
      }
    );

  const heatedArea =
    normalizeFiniteNumberInRange(
      body?.heated_area,
      {
        min: 0,
        max: 10000,
        fallback: 0,
      }
    );

  const alternativeHeatingArea =
    normalizeFiniteNumberInRange(
      body?.alternative_heating_area,
      {
        min: 0,
        max: 10000,
        fallback: 0,
      }
    );

  const landTaxArea =
    normalizeFiniteNumberInRange(
      body?.land_tax_area,
      {
        min: 0,
        max: 10000,
        fallback: 0,
      }
    );

  const notes =
    normalizeBoundedText(
      body?.notes,
      {
        maxLength: 5000,
        fallback: "",
      }
    );

  const invalid =
    [
      number,
      section,
      floor,
      roomCount,
      residentsCount,
      levelCount,
      hotWaterRiserCount,
      livingArea,
      nonLivingArea,
      heatedArea,
      alternativeHeatingArea,
      landTaxArea,
      notes,
    ].some(
      (value) =>
        value === null
    );

  if (invalid) {
    return {
      ok: false,
      error:
        "invalid_apartment_fields",
    };
  }

  return {
    ok: true,
    value: {
      number,
      section,
      floor,
      room_count:
        roomCount,
      residents_count:
        residentsCount,
      living_area:
        livingArea,
      non_living_area:
        nonLivingArea,
      heated_area:
        heatedArea,
      alternative_heating_area:
        alternativeHeatingArea,
      land_tax_area:
        landTaxArea,
      alternative_heating:
        body?.alternative_heating
          ? 1
          : 0,
      hot_water_riser_count:
        hotWaterRiserCount,
      level_count:
        levelCount,
      notes,
    },
  };
}

// =========================
// LOGIN USER LOOKUP
// Stage 2E-3: Nick-only authentication.
// Email is no longer accepted as a login identifier.
// =========================
async function findUserForLogin(env, body) {
  const nickInput =
    String(body?.nick || "").trim();

  if (!nickInput) {
    return null;
  }

  return await env.DB.prepare(`
    SELECT *
    FROM users
    WHERE nick IS NOT NULL
      AND LOWER(nick) = LOWER(?)
      AND is_active = 1
    LIMIT 1
  `)
    .bind(nickInput)
    .first();
}

// =========================
// Stage 2I-SR2:
// Removed unused legacy Service.login() implementation.
// The registered /api/login route below is the single login flow.
// =========================

// =========================
// WATER PERIOD OPENING ANNOUNCEMENTS
// =========================

async function ensureWaterPeriodAnnouncementTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS water_reporting_period_announcements (
      period_id INTEGER PRIMARY KEY,
      announcement_id INTEGER,
      claim_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id)
        REFERENCES water_reporting_periods(id),
      FOREIGN KEY (announcement_id)
        REFERENCES announcements(id)
    )
  `).run();
}

function formatWaterPeriodAnnouncementDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }

  return new Intl.DateTimeFormat("lv-LV", {
    timeZone: "Europe/Riga",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function publishWaterPeriodOpeningAnnouncements(env) {
  await ensureWaterPeriodAnnouncementTable(env);

  const result = await env.DB.prepare(`
    SELECT
      id,
      period_year,
      period_month,
      collection_opens_at,
      collection_closes_at
    FROM water_reporting_periods
    WHERE status = 'open'
      AND NOT EXISTS (
        SELECT 1
        FROM water_reporting_period_announcements link
        WHERE link.period_id = water_reporting_periods.id
      )
    ORDER BY period_year, period_month
  `).all();

  for (const period of result.results || []) {
    const claimToken = crypto.randomUUID();

    const claimResult = await env.DB.prepare(`
      INSERT OR IGNORE INTO water_reporting_period_announcements (
        period_id,
        announcement_id,
        claim_token,
        created_at
      )
      VALUES (?, NULL, ?, ?)
    `)
      .bind(
        period.id,
        claimToken,
        new Date().toISOString()
      )
      .run();

    if (!claimResult.meta?.changes) {
      continue;
    }

    try {
      const closesAt =
        formatWaterPeriodAnnouncementDate(
          period.collection_closes_at
        );

      const title =
        "Water readings / Ūdens skaitītāju rādījumi / Показания воды";

      const content = [
        `Water meter reading collection is open until ${closesAt}.`,
        `Ūdens skaitītāju rādījumu iesniegšana ir atvērta līdz ${closesAt}.`,
        `Приём показаний счётчиков воды открыт до ${closesAt}.`,
      ].join("\n\n");

      const nowIso = new Date().toISOString();

      const insertResult = await env.DB.prepare(`
        INSERT INTO announcements (
          title,
          content,
          status,
          priority,
          publish_from,
          publish_until,
          created_by,
          created_at,
          updated_at,
          published_at
        )
        VALUES (?, ?, 'published', 'important', ?, ?, NULL, ?, ?, ?)
      `)
        .bind(
          title,
          content,
          period.collection_opens_at,
          period.collection_closes_at,
          nowIso,
          nowIso,
          nowIso
        )
        .run();

      const announcementId =
        insertResult.meta.last_row_id;

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO announcement_targets (
            announcement_id,
            target_type,
            target_value
          )
          VALUES (?, 'all', NULL)
        `).bind(announcementId),

        env.DB.prepare(`
          UPDATE water_reporting_period_announcements
          SET announcement_id = ?
          WHERE period_id = ?
            AND claim_token = ?
        `).bind(
          announcementId,
          period.id,
          claimToken
        ),
      ]);

    } catch (error) {
      await env.DB.prepare(`
        DELETE FROM water_reporting_period_announcements
        WHERE period_id = ?
          AND claim_token = ?
          AND announcement_id IS NULL
      `)
        .bind(
          period.id,
          claimToken
        )
        .run();

      throw error;
    }
  }
}

// =========================
// WATER REPORTING PERIOD STATUS
// =========================
async function syncWaterReportingPeriodStatuses(
  env
) {

  const nowIso =
    new Date().toISOString();

  await env.DB.prepare(`
    UPDATE water_reporting_periods

    SET
      status = 'open',
      opened_at =
        COALESCE(
          opened_at,
          ?
        ),
      updated_at = ?

    WHERE status = 'scheduled'
      AND datetime(?) >=
        datetime(collection_opens_at)
      AND datetime(?) <=
        datetime(collection_closes_at)
  `)
    .bind(
      nowIso,
      nowIso,
      nowIso,
      nowIso
    )
    .run();

  await publishWaterPeriodOpeningAnnouncements(
    env
  );

  await env.DB.prepare(`
    UPDATE water_reporting_periods

    SET
      status = 'closed',
      closed_at =
        COALESCE(
          closed_at,
          ?
        ),
      updated_at = ?

    WHERE status = 'open'
      AND datetime(?) >
        datetime(collection_closes_at)
  `)
    .bind(
      nowIso,
      nowIso,
      nowIso
    )
    .run();
}

// =========================
// WATER REPORTING SETTINGS
// =========================

const WATER_REPORTING_SETTINGS_ID = 1;
const DEFAULT_WATER_REPORTING_DAYS_BEFORE_MONTH_END = 5;
const DEFAULT_WATER_REPORTING_DAYS_AFTER_MONTH_END = 5;
const DEFAULT_WATER_REPORTING_TIMEZONE = "Europe/Riga";

async function ensureWaterReportingSettingsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS water_reporting_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      days_before_month_end INTEGER NOT NULL DEFAULT 5,
      days_after_month_end INTEGER NOT NULL DEFAULT 5,
      timezone TEXT NOT NULL DEFAULT 'Europe/Riga',
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO water_reporting_settings (
      id,
      days_before_month_end,
      days_after_month_end,
      timezone
    )
    VALUES (?, ?, ?, ?)
  `)
    .bind(
      WATER_REPORTING_SETTINGS_ID,
      DEFAULT_WATER_REPORTING_DAYS_BEFORE_MONTH_END,
      DEFAULT_WATER_REPORTING_DAYS_AFTER_MONTH_END,
      DEFAULT_WATER_REPORTING_TIMEZONE
    )
    .run();
}

async function getWaterReportingSettings(env) {
  await ensureWaterReportingSettingsTable(env);

  return await env.DB.prepare(`
    SELECT
      id,
      days_before_month_end,
      days_after_month_end,
      timezone,
      updated_by,
      created_at,
      updated_at
    FROM water_reporting_settings
    WHERE id = ?
  `)
    .bind(WATER_REPORTING_SETTINGS_ID)
    .first();
}


// =========================
// BACKUP STATUS MODEL
// Stage 2I-SR14B:
// Read-only helpers for Admin Backup Management.
// No secrets, MEGA credentials, API tokens, or encryption passwords
// are stored or returned by this subsystem.
// =========================

const BACKUP_SETTINGS_ID = 1;
const BACKUP_RUNS_DEFAULT_LIMIT = 20;
const BACKUP_RUNS_MAX_LIMIT = 100;

// Stage 2I-SR14F-A:
// Read-only restore catalogue.
const RESTORE_POINTS_DEFAULT_LIMIT = 20;
const RESTORE_POINTS_MAX_LIMIT = 100;

// Stage 2I-SR14F-B:
// A restore request is only an authenticated, short-lived intent record.
// It does not execute a restore and grants no Cloudflare/MEGA write power.
const RESTORE_REQUEST_TTL_MINUTES = 15;
const RESTORE_REQUEST_SUPPORTED_TYPES =
  new Set([
    "offsite_backup",
  ]);
const RESTORE_REQUEST_CONFIRMATION_PREFIX =
  "CREATE RESTORE REQUEST";

// Stage 2I-SR14F-D5A:
// The arm is intentionally much shorter-lived than the protected request.
// The execution token is returned once and only its SHA-256 digest is kept
// in D1. D5A itself exposes no destructive restore endpoint.
const RESTORE_EXECUTION_ARM_TTL_MINUTES = 5;
const RESTORE_READINESS_MAX_AGE_MINUTES = 5;
const RESTORE_EXECUTION_ARM_CONFIRMATION_PREFIX =
  "ARM RESTORE EXECUTION";

// Stage 2I-SR14F-D5B-2B.
const RESTORE_EXECUTION_DISPATCH_CONFIRMATION_PREFIX =
  "DISPATCH RESTORE EXECUTION";
const DEFAULT_GITHUB_RESTORE_WORKFLOW =
  "mvx-restore-execute.yml";

async function ensureBackupStatusTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS backup_settings (
      id INTEGER PRIMARY KEY,
      automatic_enabled INTEGER NOT NULL DEFAULT 1
        CHECK (automatic_enabled IN (0, 1)),
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
    )
  `).run();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO backup_settings (
      id,
      automatic_enabled
    )
    VALUES (?, 1)
  `)
    .bind(BACKUP_SETTINGS_ID)
    .run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS backup_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_type TEXT NOT NULL
        CHECK (
          trigger_type IN (
            'scheduled',
            'manual'
          )
        ),
      status TEXT NOT NULL
        CHECK (
          status IN (
            'requested',
            'running',
            'success',
            'failed',
            'skipped'
          )
        ),
      requested_by INTEGER,
      github_run_id TEXT UNIQUE,
      started_at TEXT,
      completed_at TEXT,
      archive_name TEXT,
      archive_size_bytes INTEGER,
      archive_sha256 TEXT,
      r2_object_count INTEGER,
      main_integrity TEXT,
      pii_integrity TEXT,
      failure_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE SET NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_backup_runs_created_at
    ON backup_runs(created_at)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_backup_runs_status
    ON backup_runs(status)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_backup_runs_trigger_type
    ON backup_runs(trigger_type)
  `).run();
}

async function getBackupSettings(env) {
  await ensureBackupStatusTables(env);

  const row =
    await env.DB.prepare(`
      SELECT
        id,
        automatic_enabled,
        updated_by,
        created_at,
        updated_at
      FROM backup_settings
      WHERE id = ?
      LIMIT 1
    `)
      .bind(BACKUP_SETTINGS_ID)
      .first();

  if (!row) {
    return null;
  }

  return {
    ...row,
    automatic_enabled:
      Number(
        row.automatic_enabled
      ) === 1,
  };
}

function normalizeBackupRunRow(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      Number(row.id),
    trigger_type:
      row.trigger_type,
    status:
      row.status,
    requested_by:
      row.requested_by === null ||
      row.requested_by === undefined
        ? null
        : Number(
            row.requested_by
          ),
    requested_by_nick:
      row.requested_by_nick ||
      null,
    github_run_id:
      row.github_run_id ||
      null,
    started_at:
      row.started_at ||
      null,
    completed_at:
      row.completed_at ||
      null,
    archive_name:
      row.archive_name ||
      null,
    archive_size_bytes:
      row.archive_size_bytes === null ||
      row.archive_size_bytes === undefined
        ? null
        : Number(
            row.archive_size_bytes
          ),
    archive_sha256:
      row.archive_sha256 ||
      null,
    r2_object_count:
      row.r2_object_count === null ||
      row.r2_object_count === undefined
        ? null
        : Number(
            row.r2_object_count
          ),
    main_integrity:
      row.main_integrity ||
      null,
    pii_integrity:
      row.pii_integrity ||
      null,
    failure_code:
      row.failure_code ||
      null,
    created_at:
      row.created_at,
    updated_at:
      row.updated_at,
  };
}

async function getBackupRuns(
  env,
  limit =
    BACKUP_RUNS_DEFAULT_LIMIT
) {
  await ensureBackupStatusTables(env);

  const normalizedLimit =
    normalizeIntegerInRange(
      limit,
      {
        min: 1,
        max:
          BACKUP_RUNS_MAX_LIMIT,
        fallback:
          BACKUP_RUNS_DEFAULT_LIMIT,
      }
    );

  const safeLimit =
    normalizedLimit ??
    BACKUP_RUNS_DEFAULT_LIMIT;

  const result =
    await env.DB.prepare(`
      SELECT
        br.id,
        br.trigger_type,
        br.status,
        br.requested_by,
        requester.nick
          AS requested_by_nick,
        br.github_run_id,
        br.started_at,
        br.completed_at,
        br.archive_name,
        br.archive_size_bytes,
        br.archive_sha256,
        br.r2_object_count,
        br.main_integrity,
        br.pii_integrity,
        br.failure_code,
        br.created_at,
        br.updated_at
      FROM backup_runs br
      LEFT JOIN users requester
        ON requester.id =
          br.requested_by
      ORDER BY
        datetime(br.created_at)
          DESC,
        br.id DESC
      LIMIT ?
    `)
      .bind(safeLimit)
      .all();

  return (
    result.results || []
  ).map(
    normalizeBackupRunRow
  );
}

async function getLatestBackupRun(
  env,
  {
    successfulOnly = false,
  } = {}
) {
  await ensureBackupStatusTables(env);

  const statusClause =
    successfulOnly
      ? "WHERE br.status = 'success'"
      : "";

  const row =
    await env.DB.prepare(`
      SELECT
        br.id,
        br.trigger_type,
        br.status,
        br.requested_by,
        requester.nick
          AS requested_by_nick,
        br.github_run_id,
        br.started_at,
        br.completed_at,
        br.archive_name,
        br.archive_size_bytes,
        br.archive_sha256,
        br.r2_object_count,
        br.main_integrity,
        br.pii_integrity,
        br.failure_code,
        br.created_at,
        br.updated_at
      FROM backup_runs br
      LEFT JOIN users requester
        ON requester.id =
          br.requested_by
      ${statusClause}
      ORDER BY
        datetime(br.created_at)
          DESC,
        br.id DESC
      LIMIT 1
    `)
      .first();

  return normalizeBackupRunRow(
    row
  );
}


async function getBackupRunById(
  env,
  backupRunId
) {
  await ensureBackupStatusTables(env);

  const normalizedId =
    normalizePositiveInteger(
      backupRunId
    );

  if (!normalizedId) {
    return null;
  }

  const row =
    await env.DB.prepare(`
      SELECT
        br.id,
        br.trigger_type,
        br.status,
        br.requested_by,
        requester.nick
          AS requested_by_nick,
        br.github_run_id,
        br.started_at,
        br.completed_at,
        br.archive_name,
        br.archive_size_bytes,
        br.archive_sha256,
        br.r2_object_count,
        br.main_integrity,
        br.pii_integrity,
        br.failure_code,
        br.created_at,
        br.updated_at
      FROM backup_runs br
      LEFT JOIN users requester
        ON requester.id =
          br.requested_by
      WHERE br.id = ?
      LIMIT 1
    `)
      .bind(
        normalizedId
      )
      .first();

  return normalizeBackupRunRow(
    row
  );
}

function getGitHubBackupConfiguration(
  env
) {
  const owner =
    String(
      env?.GITHUB_OWNER || ""
    ).trim();

  const repo =
    String(
      env?.GITHUB_REPO || ""
    ).trim();

  const workflow =
    String(
      env?.GITHUB_BACKUP_WORKFLOW || ""
    ).trim();

  const token =
    String(
      env?.GITHUB_BACKUP_TOKEN || ""
    ).trim();

  if (
    !owner ||
    !repo ||
    !workflow ||
    !token
  ) {
    return {
      ok: false,
      error:
        "backup_github_not_configured",
    };
  }

  return {
    ok: true,
    owner,
    repo,
    workflow,
    token,
  };
}


function getGitHubRestoreExecutionConfiguration(
  env
) {
  const owner =
    String(
      env?.GITHUB_OWNER || ""
    ).trim();

  const repo =
    String(
      env?.GITHUB_REPO || ""
    ).trim();

  const workflow =
    String(
      env?.GITHUB_RESTORE_WORKFLOW ||
      DEFAULT_GITHUB_RESTORE_WORKFLOW
    ).trim();

  const token =
    String(
      env?.GITHUB_BACKUP_TOKEN || ""
    ).trim();

  if (
    !owner ||
    !repo ||
    !workflow ||
    !token
  ) {
    return {
      ok: false,
      error:
        "restore_github_not_configured",
    };
  }

  return {
    ok: true,
    owner,
    repo,
    workflow,
    token,
  };
}


// =========================
// RESTORE STATUS HELPERS
// Stage 2I-SR14F-A
//
// This subsystem is deliberately read-only.
// It can:
// - read current D1 Time Travel bookmarks through Cloudflare API;
// - list successful encrypted offsite backups recorded in Main D1.
//
// It cannot:
// - restore D1;
// - import an archive;
// - overwrite any database;
// - mutate backup history.
//
// Cloudflare API token should have D1 Read only.
// =========================

function getCloudflareD1ReadConfiguration(
  env
) {
  const accountId =
    String(
      env?.CLOUDFLARE_ACCOUNT_ID ||
      ""
    ).trim();

  const mainDatabaseId =
    String(
      env?.MAIN_D1_DATABASE_ID ||
      ""
    ).trim();

  const piiDatabaseId =
    String(
      env?.PII_D1_DATABASE_ID ||
      ""
    ).trim();

  const apiToken =
    String(
      env?.CLOUDFLARE_D1_READ_TOKEN ||
      ""
    ).trim();

  const configured =
    Boolean(
      accountId &&
      mainDatabaseId &&
      piiDatabaseId &&
      apiToken
    );

  return {
    configured,
    account_id:
      accountId || null,
    main_database_id:
      mainDatabaseId || null,
    pii_database_id:
      piiDatabaseId || null,
    api_token:
      apiToken || null,
  };
}

function getConfiguredTimeTravelWindowDays(
  env
) {
  const raw =
    String(
      env?.D1_TIME_TRAVEL_WINDOW_DAYS ||
      ""
    ).trim();

  if (!raw) {
    return null;
  }

  const value =
    Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 30
  ) {
    return null;
  }

  return value;
}

async function getD1TimeTravelBookmark(
  {
    accountId,
    databaseId,
    apiToken,
    databaseName,
  }
) {
  const checkedAt =
    new Date().toISOString();

  if (
    !accountId ||
    !databaseId ||
    !apiToken
  ) {
    return {
      database:
        databaseName,
      database_id:
        databaseId || null,
      available: false,
      bookmark: null,
      checked_at:
        checkedAt,
      error:
        "time_travel_status_not_configured",
    };
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      accountId
    )}/d1/database/${encodeURIComponent(
      databaseId
    )}/time_travel/bookmark`;

  let response;

  try {
    response =
      await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Authorization":
              `Bearer ${apiToken}`,
            "Accept":
              "application/json",
          },
        }
      );
  } catch (error) {
    App.logError(
      "restore_status_cloudflare_request_error",
      error,
      {
        database:
          databaseName,
      }
    );

    return {
      database:
        databaseName,
      database_id:
        databaseId,
      available: false,
      bookmark: null,
      checked_at:
        checkedAt,
      error:
        "time_travel_status_unavailable",
    };
  }

  if (!response.ok) {
    App.logError(
      "restore_status_cloudflare_response_error",
      new Error(
        "cloudflare_api_rejected"
      ),
      {
        database:
          databaseName,
        cloudflare_status:
          Number(
            response.status
          ),
      }
    );

    return {
      database:
        databaseName,
      database_id:
        databaseId,
      available: false,
      bookmark: null,
      checked_at:
        checkedAt,
      error:
        "time_travel_status_unavailable",
    };
  }

  const payload =
    await response
      .json()
      .catch(() => null);

  const bookmark =
    String(
      payload?.result?.bookmark ||
      ""
    ).trim();

  if (
    payload?.success !== true ||
    !bookmark
  ) {
    return {
      database:
        databaseName,
      database_id:
        databaseId,
      available: false,
      bookmark: null,
      checked_at:
        checkedAt,
      error:
        "time_travel_bookmark_missing",
    };
  }

  return {
    database:
      databaseName,
    database_id:
      databaseId,
    available: true,
    bookmark,
    checked_at:
      checkedAt,
    error: null,
  };
}

async function getOffsiteRestorePoints(
  env,
  limit =
    RESTORE_POINTS_DEFAULT_LIMIT
) {
  await ensureBackupStatusTables(
    env
  );

  const normalizedLimit =
    normalizeIntegerInRange(
      limit,
      {
        min: 1,
        max:
          RESTORE_POINTS_MAX_LIMIT,
        fallback:
          RESTORE_POINTS_DEFAULT_LIMIT,
      }
    );

  const safeLimit =
    normalizedLimit ??
    RESTORE_POINTS_DEFAULT_LIMIT;

  const result =
    await env.DB.prepare(`
      SELECT
        id,
        trigger_type,
        github_run_id,
        completed_at,
        archive_name,
        archive_size_bytes,
        archive_sha256,
        r2_object_count,
        main_integrity,
        pii_integrity,
        created_at
      FROM backup_runs
      WHERE status = 'success'
        AND archive_name IS NOT NULL
        AND TRIM(archive_name) <> ''
      ORDER BY
        datetime(
          COALESCE(
            completed_at,
            created_at
          )
        ) DESC,
        id DESC
      LIMIT ?
    `)
      .bind(
        safeLimit
      )
      .all();

  return (
    result.results || []
  ).map(
    (row) => ({
      backup_run_id:
        Number(row.id),
      trigger_type:
        row.trigger_type,
      github_run_id:
        row.github_run_id ||
        null,
      completed_at:
        row.completed_at ||
        null,
      archive_name:
        row.archive_name,
      archive_size_bytes:
        row.archive_size_bytes ===
          null ||
        row.archive_size_bytes ===
          undefined
          ? null
          : Number(
              row.archive_size_bytes
            ),
      archive_sha256:
        row.archive_sha256 ||
        null,
      r2_object_count:
        row.r2_object_count ===
          null ||
        row.r2_object_count ===
          undefined
          ? null
          : Number(
              row.r2_object_count
            ),
      main_integrity:
        row.main_integrity ||
        null,
      pii_integrity:
        row.pii_integrity ||
        null,
      created_at:
        row.created_at,
      restorable:
        Boolean(
          row.archive_name &&
          row.archive_sha256 &&
          row.main_integrity ===
            "ok" &&
          row.pii_integrity ===
            "ok"
        ),
    })
  );
}

// =========================
// PROTECTED RESTORE REQUESTS
// Stage 2I-SR14F-B
//
// The request table records a short-lived, explicitly confirmed intent.
// No restore execution is implemented in this stage.
// =========================

async function ensureRestoreRequestSchema(
  env
) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS restore_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restore_type TEXT NOT NULL
        CHECK (
          restore_type IN (
            'main_d1_time_travel',
            'pii_d1_time_travel',
            'offsite_backup'
          )
        ),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
          status IN (
            'pending',
            'cancelled',
            'expired',
            'executed',
            'failed'
          )
        ),
      requested_by INTEGER NOT NULL,
      backup_run_id INTEGER,
      target_timestamp TEXT,
      target_bookmark TEXT,
      archive_name TEXT,
      archive_sha256 TEXT,
      confirmed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      executed_at TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,
      FOREIGN KEY (backup_run_id)
        REFERENCES backup_runs(id)
        ON DELETE RESTRICT
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_requests_status
    ON restore_requests(status)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_requests_requested_by
    ON restore_requests(requested_by)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_requests_expires_at
    ON restore_requests(expires_at)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_requests_backup_run_id
    ON restore_requests(backup_run_id)
  `).run();

  // Concurrency guard: one pending request per administrator.
  // Expired rows are first moved to status='expired' by the POST flow.
  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      idx_restore_requests_one_pending_per_admin
    ON restore_requests(requested_by)
    WHERE status = 'pending'
  `).run();
}

function getRestoreRequestConfirmationPhrase(
  backupRunId
) {
  return `${RESTORE_REQUEST_CONFIRMATION_PREFIX} ${backupRunId}`;
}

function normalizeRestoreRequestRow(
  row
) {
  if (!row) {
    return null;
  }

  return {
    id:
      Number(row.id),
    restore_type:
      row.restore_type,
    status:
      row.status,
    requested_by:
      Number(row.requested_by),
    requested_by_nick:
      row.requested_by_nick ||
      null,
    backup_run_id:
      row.backup_run_id === null ||
      row.backup_run_id === undefined
        ? null
        : Number(
            row.backup_run_id
          ),
    target_timestamp:
      row.target_timestamp ||
      null,
    target_bookmark:
      row.target_bookmark ||
      null,
    archive_name:
      row.archive_name ||
      null,
    archive_sha256:
      row.archive_sha256 ||
      null,
    confirmed_at:
      row.confirmed_at,
    expires_at:
      row.expires_at,
    executed_at:
      row.executed_at ||
      null,
    cancelled_at:
      row.cancelled_at ||
      null,
    created_at:
      row.created_at,
    updated_at:
      row.updated_at,
  };
}

async function getActiveRestoreRequest(
  env,
  requestedBy
) {
  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (!userId) {
    return null;
  }

  const row =
    await env.DB.prepare(`
      SELECT
        rr.id,
        rr.restore_type,
        rr.status,
        rr.requested_by,
        requester.nick
          AS requested_by_nick,
        rr.backup_run_id,
        rr.target_timestamp,
        rr.target_bookmark,
        rr.archive_name,
        rr.archive_sha256,
        rr.confirmed_at,
        rr.expires_at,
        rr.executed_at,
        rr.cancelled_at,
        rr.created_at,
        rr.updated_at
      FROM restore_requests rr
      LEFT JOIN users requester
        ON requester.id =
          rr.requested_by
      WHERE rr.requested_by = ?
        AND rr.status = 'pending'
        AND datetime(rr.expires_at) >
          datetime('now')
      ORDER BY
        datetime(rr.created_at) DESC,
        rr.id DESC
      LIMIT 1
    `)
      .bind(
        userId
      )
      .first();

  return normalizeRestoreRequestRow(
    row
  );
}

async function getRestoreRequestById(
  env,
  restoreRequestId,
  requestedBy
) {
  const requestId =
    normalizePositiveInteger(
      restoreRequestId
    );

  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (
    !requestId ||
    !userId
  ) {
    return null;
  }

  const row =
    await env.DB.prepare(`
      SELECT
        rr.id,
        rr.restore_type,
        rr.status,
        rr.requested_by,
        requester.nick
          AS requested_by_nick,
        rr.backup_run_id,
        rr.target_timestamp,
        rr.target_bookmark,
        rr.archive_name,
        rr.archive_sha256,
        rr.confirmed_at,
        rr.expires_at,
        rr.executed_at,
        rr.cancelled_at,
        rr.created_at,
        rr.updated_at
      FROM restore_requests rr
      LEFT JOIN users requester
        ON requester.id =
          rr.requested_by
      WHERE rr.id = ?
        AND rr.requested_by = ?
      LIMIT 1
    `)
      .bind(
        requestId,
        userId
      )
      .first();

  return normalizeRestoreRequestRow(
    row
  );
}

async function expireRestoreRequests(
  env,
  requestedBy
) {
  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (!userId) {
    return;
  }

  const nowIso =
    new Date().toISOString();

  await env.DB.prepare(`
    UPDATE restore_requests
    SET
      status = 'expired',
      updated_at = ?
    WHERE requested_by = ?
      AND status = 'pending'
      AND datetime(expires_at) <=
        datetime(?)
  `)
    .bind(
      nowIso,
      userId,
      nowIso
    )
    .run();
}

async function getVerifiedOffsiteRestorePoint(
  env,
  backupRunId
) {
  const run =
    await getBackupRunById(
      env,
      backupRunId
    );

  if (!run) {
    return {
      ok: false,
      error:
        "restore_point_not_found",
    };
  }

  const restorable =
    run.status === "success" &&
    Boolean(
      run.archive_name &&
      run.archive_sha256 &&
      run.main_integrity ===
        "ok" &&
      run.pii_integrity ===
        "ok"
    );

  if (!restorable) {
    return {
      ok: false,
      error:
        "restore_point_not_verified",
    };
  }

  return {
    ok: true,
    point: run,
  };
}


// =========================
// RESTORE PREVIEW / VALIDATION
// Stage 2I-SR14F-C
//
// Validation is a preflight only.
// It records:
// - whether the protected request is still live;
// - whether the selected offsite backup metadata is still verified;
// - current Main/PII D1 Time Travel bookmarks as safety checkpoints.
//
// It NEVER calls a destructive D1 restore endpoint and never writes
// to MEGA or R2.
// =========================

async function ensureRestoreValidationSchema(
  env
) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS restore_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restore_request_id INTEGER NOT NULL,
      validation_status TEXT NOT NULL
        CHECK (
          validation_status IN (
            'ready',
            'blocked',
            'failed'
          )
        ),
      main_ready INTEGER NOT NULL DEFAULT 0
        CHECK (main_ready IN (0, 1)),
      pii_ready INTEGER NOT NULL DEFAULT 0
        CHECK (pii_ready IN (0, 1)),
      offsite_ready INTEGER NOT NULL DEFAULT 0
        CHECK (offsite_ready IN (0, 1)),
      target_timestamp TEXT,
      main_bookmark TEXT,
      pii_bookmark TEXT,
      failure_code TEXT,
      validated_by INTEGER NOT NULL,
      validated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restore_request_id)
        REFERENCES restore_requests(id)
        ON DELETE CASCADE,
      FOREIGN KEY (validated_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_validations_request
    ON restore_validations(restore_request_id)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_validations_status
    ON restore_validations(validation_status)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_restore_validations_validated_at
    ON restore_validations(validated_at)
  `).run();
}

function normalizeRestoreValidationRow(
  row
) {
  if (!row) {
    return null;
  }

  return {
    id:
      Number(row.id),
    restore_request_id:
      Number(
        row.restore_request_id
      ),
    validation_status:
      row.validation_status,
    main_ready:
      Number(row.main_ready) === 1,
    pii_ready:
      Number(row.pii_ready) === 1,
    offsite_ready:
      Number(row.offsite_ready) === 1,
    target_timestamp:
      row.target_timestamp ||
      null,
    main_bookmark:
      row.main_bookmark ||
      null,
    pii_bookmark:
      row.pii_bookmark ||
      null,
    failure_code:
      row.failure_code ||
      null,
    validated_by:
      Number(row.validated_by),
    validated_at:
      row.validated_at,
    created_at:
      row.created_at,
  };
}

async function getLatestRestoreValidation(
  env,
  restoreRequestId,
  requestedBy
) {
  const requestId =
    normalizePositiveInteger(
      restoreRequestId
    );

  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (
    !requestId ||
    !userId
  ) {
    return null;
  }

  await ensureRestoreValidationSchema(
    env
  );

  const row =
    await env.DB.prepare(`
      SELECT
        rv.id,
        rv.restore_request_id,
        rv.validation_status,
        rv.main_ready,
        rv.pii_ready,
        rv.offsite_ready,
        rv.target_timestamp,
        rv.main_bookmark,
        rv.pii_bookmark,
        rv.failure_code,
        rv.validated_by,
        rv.validated_at,
        rv.created_at
      FROM restore_validations rv
      JOIN restore_requests rr
        ON rr.id =
          rv.restore_request_id
      WHERE rv.restore_request_id = ?
        AND rr.requested_by = ?
      ORDER BY
        datetime(rv.validated_at) DESC,
        rv.id DESC
      LIMIT 1
    `)
      .bind(
        requestId,
        userId
      )
      .first();

  return normalizeRestoreValidationRow(
    row
  );
}

async function getRestoreTimeTravelSafetyCheckpoints(
  env
) {
  const cloudflare =
    getCloudflareD1ReadConfiguration(
      env
    );

  if (!cloudflare.configured) {
    const checkedAt =
      new Date().toISOString();

    return {
      configured: false,
      main: {
        database:
          "housing-db",
        database_id:
          cloudflare
            .main_database_id,
        available: false,
        bookmark: null,
        checked_at:
          checkedAt,
        error:
          "time_travel_status_not_configured",
      },
      pii: {
        database:
          "housing-pii-db",
        database_id:
          cloudflare
            .pii_database_id,
        available: false,
        bookmark: null,
        checked_at:
          checkedAt,
        error:
          "time_travel_status_not_configured",
      },
    };
  }

  const [
    main,
    pii,
  ] =
    await Promise.all([
      getD1TimeTravelBookmark({
        accountId:
          cloudflare.account_id,
        databaseId:
          cloudflare.main_database_id,
        apiToken:
          cloudflare.api_token,
        databaseName:
          "housing-db",
      }),

      getD1TimeTravelBookmark({
        accountId:
          cloudflare.account_id,
        databaseId:
          cloudflare.pii_database_id,
        apiToken:
          cloudflare.api_token,
        databaseName:
          "housing-pii-db",
      }),
    ]);

  return {
    configured: true,
    main,
    pii,
  };
}

function getRestoreValidationFailureCode({
  offsiteReady,
  mainReady,
  piiReady,
  offsiteError = null,
  timeTravelConfigured = true,
}) {
  if (!offsiteReady) {
    return (
      offsiteError ||
      "offsite_restore_point_not_verified"
    );
  }

  if (!timeTravelConfigured) {
    return "time_travel_status_not_configured";
  }

  if (!mainReady) {
    return "main_time_travel_unavailable";
  }

  if (!piiReady) {
    return "pii_time_travel_unavailable";
  }

  return null;
}


// =========================
// RESTORE READINESS / FINAL PRE-RESTORE VALIDATION
// Stage 2I-SR14F-D4
//
// This layer combines the protected request, preview validation,
// verified offsite archive checks and fresh D1 Time Travel safety
// checkpoints into one immutable readiness record.
//
// It NEVER performs a restore, import, overwrite, MEGA write or R2 write.
// =========================

function normalizeRestoreReadinessRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    restore_request_id:
      Number(row.restore_request_id),
    validation_id:
      row.validation_id === null
        ? null
        : Number(row.validation_id),
    offsite_check_id:
      row.offsite_check_id === null
        ? null
        : Number(row.offsite_check_id),
    status: row.status,
    request_active:
      Number(row.request_active) === 1,
    preview_ready:
      Number(row.preview_ready) === 1,
    offsite_present:
      Number(row.offsite_present) === 1,
    sha256_verified:
      Number(row.sha256_verified) === 1,
    decryption_verified:
      Number(row.decryption_verified) === 1,
    archive_structure_verified:
      Number(row.archive_structure_verified) === 1,
    internal_checksums_verified:
      Number(row.internal_checksums_verified) === 1,
    main_sql_integrity:
      row.main_sql_integrity || null,
    pii_sql_integrity:
      row.pii_sql_integrity || null,
    main_checkpoint_bookmark:
      row.main_checkpoint_bookmark || null,
    pii_checkpoint_bookmark:
      row.pii_checkpoint_bookmark || null,
    failure_code:
      row.failure_code || null,
    checked_by:
      Number(row.checked_by),
    checked_at:
      row.checked_at,
    created_at:
      row.created_at,
  };
}

async function getLatestRestoreReadiness(
  env,
  restoreRequestId,
  requestedBy
) {
  const requestId =
    normalizePositiveInteger(
      restoreRequestId
    );

  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (!requestId || !userId) {
    return null;
  }

  const row =
    await env.DB.prepare(`
      SELECT
        rrdy.id,
        rrdy.restore_request_id,
        rrdy.validation_id,
        rrdy.offsite_check_id,
        rrdy.status,
        rrdy.request_active,
        rrdy.preview_ready,
        rrdy.offsite_present,
        rrdy.sha256_verified,
        rrdy.decryption_verified,
        rrdy.archive_structure_verified,
        rrdy.internal_checksums_verified,
        rrdy.main_sql_integrity,
        rrdy.pii_sql_integrity,
        rrdy.main_checkpoint_bookmark,
        rrdy.pii_checkpoint_bookmark,
        rrdy.failure_code,
        rrdy.checked_by,
        rrdy.checked_at,
        rrdy.created_at
      FROM restore_readiness rrdy
      JOIN restore_requests rr
        ON rr.id = rrdy.restore_request_id
      WHERE rrdy.restore_request_id = ?
        AND rr.requested_by = ?
      ORDER BY
        datetime(rrdy.checked_at) DESC,
        rrdy.id DESC
      LIMIT 1
    `)
      .bind(requestId, userId)
      .first();

  return normalizeRestoreReadinessRow(
    row
  );
}

async function getLatestCompletedOffsiteCheck(
  env,
  restoreRequestId,
  requestedBy
) {
  const requestId =
    normalizePositiveInteger(
      restoreRequestId
    );

  const userId =
    normalizePositiveInteger(
      requestedBy
    );

  if (!requestId || !userId) {
    return null;
  }

  return await env.DB.prepare(`
    SELECT
      roc.id,
      roc.restore_request_id,
      roc.status,
      roc.archive_name,
      roc.expected_sha256,
      roc.actual_sha256,
      roc.sha256_verified,
      roc.decryption_verified,
      roc.archive_structure_verified,
      roc.internal_checksums_verified,
      roc.main_sql_integrity,
      roc.pii_sql_integrity,
      roc.failure_code,
      roc.completed_at,
      roc.content_validated_at,
      roc.created_at
    FROM restore_offsite_checks roc
    JOIN restore_requests rr
      ON rr.id = roc.restore_request_id
    WHERE roc.restore_request_id = ?
      AND rr.requested_by = ?
    ORDER BY
      datetime(
        COALESCE(
          roc.content_validated_at,
          roc.completed_at,
          roc.created_at
        )
      ) DESC,
      roc.id DESC
    LIMIT 1
  `)
    .bind(requestId, userId)
    .first();
}

function getRestoreReadinessFailureCode({
  requestActive,
  previewReady,
  offsitePresent,
  sha256Verified,
  decryptionVerified,
  archiveStructureVerified,
  internalChecksumsVerified,
  mainSqlIntegrity,
  piiSqlIntegrity,
  mainCheckpointReady,
  piiCheckpointReady,
}) {
  if (!requestActive) {
    return "restore_request_not_active";
  }

  if (!previewReady) {
    return "preview_validation_not_ready";
  }

  if (!offsitePresent) {
    return "offsite_archive_not_present";
  }

  if (!sha256Verified) {
    return "offsite_sha256_not_verified";
  }

  if (!decryptionVerified) {
    return "offsite_decryption_not_verified";
  }

  if (!archiveStructureVerified) {
    return "archive_structure_not_verified";
  }

  if (!internalChecksumsVerified) {
    return "internal_checksums_not_verified";
  }

  if (mainSqlIntegrity !== "ok") {
    return "main_sql_integrity_not_ok";
  }

  if (piiSqlIntegrity !== "ok") {
    return "pii_sql_integrity_not_ok";
  }

  if (!mainCheckpointReady) {
    return "main_time_travel_checkpoint_unavailable";
  }

  if (!piiCheckpointReady) {
    return "pii_time_travel_checkpoint_unavailable";
  }

  return null;
}

function getDatePartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMilliseconds(date, timeZone) {
  const parts = getDatePartsInTimeZone(date, timeZone);

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToIso({
  year,
  month,
  day,
  hour,
  minute,
  second,
  timeZone,
}) {
  let utcTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = getTimeZoneOffsetMilliseconds(
      new Date(utcTimestamp),
      timeZone
    );

    utcTimestamp = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    ) - offset;
  }

  return new Date(utcTimestamp).toISOString();
}

function addDaysToUtcDate(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function calculateWaterReportingPeriod({
  year,
  month,
  daysBeforeMonthEnd,
  daysAfterMonthEnd,
  timeZone,
}) {
  const monthEndDate = new Date(
    Date.UTC(year, month, 0, 12, 0, 0)
  );

  const openDate = addDaysToUtcDate(
    monthEndDate,
    -daysBeforeMonthEnd
  );

  const closeDate = addDaysToUtcDate(
    monthEndDate,
    daysAfterMonthEnd
  );

  const collectionOpensAt = zonedDateTimeToIso({
    year: openDate.getUTCFullYear(),
    month: openDate.getUTCMonth() + 1,
    day: openDate.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
    timeZone,
  });

  const collectionClosesAt = zonedDateTimeToIso({
    year: closeDate.getUTCFullYear(),
    month: closeDate.getUTCMonth() + 1,
    day: closeDate.getUTCDate(),
    hour: 23,
    minute: 59,
    second: 59,
    timeZone,
  });

  return {
    period_year: year,
    period_month: month,
    collection_opens_at: collectionOpensAt,
    collection_closes_at: collectionClosesAt,
  };
}

function getNextYearMonth(year, month) {
  if (month === 12) {
    return {
      year: year + 1,
      month: 1,
    };
  }

  return {
    year,
    month: month + 1,
  };
}

async function resolveManagedWaterReportingMonth(env, timeZone) {
  const scheduledPeriod = await env.DB.prepare(`
    SELECT
      id,
      period_year,
      period_month,
      status,
      collection_opens_at,
      collection_closes_at
    FROM water_reporting_periods
    WHERE status = 'scheduled'
    ORDER BY period_year ASC, period_month ASC
    LIMIT 1
  `).first();

  if (scheduledPeriod) {
    return {
      year: Number(scheduledPeriod.period_year),
      month: Number(scheduledPeriod.period_month),
      existing_period: scheduledPeriod,
    };
  }

  const openPeriod = await env.DB.prepare(`
    SELECT
      id,
      period_year,
      period_month,
      status,
      collection_opens_at,
      collection_closes_at
    FROM water_reporting_periods
    WHERE status = 'open'
    ORDER BY period_year DESC, period_month DESC
    LIMIT 1
  `).first();

  if (openPeriod) {
    const next = getNextYearMonth(
      Number(openPeriod.period_year),
      Number(openPeriod.period_month)
    );

    return {
      ...next,
      existing_period: null,
    };
  }

  const nowParts = getDatePartsInTimeZone(
    new Date(),
    timeZone
  );

  return {
    year: nowParts.year,
    month: nowParts.month,
    existing_period: null,
  };
}

async function findWaterReportingPeriodOverlap(
  env,
  collectionOpensAt,
  collectionClosesAt,
  excludedPeriodId = null
) {
  const overlap = await env.DB.prepare(`
    SELECT
      id,
      period_year,
      period_month,
      status,
      collection_opens_at,
      collection_closes_at
    FROM water_reporting_periods
    WHERE (? IS NULL OR id <> ?)
      AND datetime(collection_opens_at) <= datetime(?)
      AND datetime(collection_closes_at) >= datetime(?)
    ORDER BY period_year, period_month
    LIMIT 1
  `)
    .bind(
      excludedPeriodId,
      excludedPeriodId,
      collectionClosesAt,
      collectionOpensAt
    )
    .first();

  return overlap || null;
}

async function upsertManagedWaterReportingPeriod({
  env,
  adminUserId,
  daysBeforeMonthEnd,
  daysAfterMonthEnd,
  timeZone,
}) {
  await syncWaterReportingPeriodStatuses(env);

  const managedMonth = await resolveManagedWaterReportingMonth(
    env,
    timeZone
  );

  const calculatedPeriod = calculateWaterReportingPeriod({
    year: managedMonth.year,
    month: managedMonth.month,
    daysBeforeMonthEnd,
    daysAfterMonthEnd,
    timeZone,
  });

  const overlap = await findWaterReportingPeriodOverlap(
    env,
    calculatedPeriod.collection_opens_at,
    calculatedPeriod.collection_closes_at,
    managedMonth.existing_period?.id || null
  );

  if (overlap) {
    return {
      ok: false,
      error: "water_reporting_period_overlap",
      overlap_period: overlap,
      calculated_period: calculatedPeriod,
    };
  }

  const nowIso = new Date().toISOString();

  if (managedMonth.existing_period) {
    await env.DB.prepare(`
      UPDATE water_reporting_periods
      SET
        collection_opens_at = ?,
        collection_closes_at = ?,
        notes = CASE
          WHEN notes IS NULL OR TRIM(notes) = ''
            THEN 'Managed from Water Reporting Settings'
          ELSE notes
        END,
        updated_at = ?
      WHERE id = ?
        AND status = 'scheduled'
    `)
      .bind(
        calculatedPeriod.collection_opens_at,
        calculatedPeriod.collection_closes_at,
        nowIso,
        managedMonth.existing_period.id
      )
      .run();

    return {
      ok: true,
      action: "updated",
      period_id: managedMonth.existing_period.id,
      calculated_period: calculatedPeriod,
    };
  }

  const duplicateMonth = await env.DB.prepare(`
    SELECT id, status
    FROM water_reporting_periods
    WHERE period_year = ?
      AND period_month = ?
    LIMIT 1
  `)
    .bind(
      calculatedPeriod.period_year,
      calculatedPeriod.period_month
    )
    .first();

  if (duplicateMonth) {
    return {
      ok: false,
      error: "water_reporting_period_month_exists",
      existing_period: duplicateMonth,
      calculated_period: calculatedPeriod,
    };
  }

  const result = await env.DB.prepare(`
    INSERT INTO water_reporting_periods (
      period_year,
      period_month,
      status,
      collection_opens_at,
      collection_closes_at,
      notes,
      created_at,
      updated_at
    )
    VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?)
  `)
    .bind(
      calculatedPeriod.period_year,
      calculatedPeriod.period_month,
      calculatedPeriod.collection_opens_at,
      calculatedPeriod.collection_closes_at,
      `Automatically generated from Water Reporting Settings by user ${adminUserId}`,
      nowIso,
      nowIso
    )
    .run();

  return {
    ok: true,
    action: "created",
    period_id: result.meta.last_row_id,
    calculated_period: calculatedPeriod,
  };
}

function getRestoreExecutionArmConfirmationPhrase(
  restoreRequestId
) {
  return `${RESTORE_EXECUTION_ARM_CONFIRMATION_PREFIX} ${restoreRequestId}`;
}


function getRestoreExecutionDispatchConfirmationPhrase(
  restoreRequestId
) {
  return `${RESTORE_EXECUTION_DISPATCH_CONFIRMATION_PREFIX} ${restoreRequestId}`;
}

function normalizeRestoreExecutionArmRow(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      Number(row.id),
    restore_request_id:
      Number(row.restore_request_id),
    readiness_id:
      Number(row.readiness_id),
    status:
      row.status,
    armed_by:
      Number(row.armed_by),
    armed_at:
      row.armed_at,
    expires_at:
      row.expires_at,
    consumed_at:
      row.consumed_at || null,
    cancelled_at:
      row.cancelled_at || null,
    created_at:
      row.created_at,
    updated_at:
      row.updated_at,
  };
}

async function expireRestoreExecutionArms(
  env,
  armedBy = null
) {
  const nowIso =
    new Date().toISOString();

  if (armedBy) {
    await env.DB.prepare(`
      UPDATE restore_execution_arms
      SET
        status = 'expired',
        updated_at = ?
      WHERE status = 'armed'
        AND armed_by = ?
        AND datetime(expires_at) <= datetime(?)
    `)
      .bind(
        nowIso,
        armedBy,
        nowIso
      )
      .run();

    return;
  }

  await env.DB.prepare(`
    UPDATE restore_execution_arms
    SET
      status = 'expired',
      updated_at = ?
    WHERE status = 'armed'
      AND datetime(expires_at) <= datetime(?)
  `)
    .bind(
      nowIso,
      nowIso
    )
    .run();
}

async function getActiveRestoreExecutionArm(
  env,
  armedBy
) {
  const userId =
    normalizePositiveInteger(
      armedBy
    );

  if (!userId) {
    return null;
  }

  await expireRestoreExecutionArms(
    env,
    userId
  );

  const row =
    await env.DB.prepare(`
      SELECT
        id,
        restore_request_id,
        readiness_id,
        status,
        armed_by,
        armed_at,
        expires_at,
        consumed_at,
        cancelled_at,
        created_at,
        updated_at
      FROM restore_execution_arms
      WHERE armed_by = ?
        AND status = 'armed'
        AND datetime(expires_at) > datetime(?)
      ORDER BY id DESC
      LIMIT 1
    `)
      .bind(
        userId,
        new Date().toISOString()
      )
      .first();

  return normalizeRestoreExecutionArmRow(
    row
  );
}

async function sha256Hex(value) {
  const bytes =
    encoder.encode(
      String(value)
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function generateRestoreExecutionToken() {
  const bytes =
    new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return base64url(bytes);
}

function isRestoreReadinessFresh(
  readiness
) {
  if (
    !readiness ||
    !readiness.checked_at
  ) {
    return false;
  }

  const checkedAt =
    Date.parse(
      readiness.checked_at
    );

  if (!Number.isFinite(checkedAt)) {
    return false;
  }

  const ageMs =
    Date.now() - checkedAt;

  return (
    ageMs >= 0 &&
    ageMs <=
      RESTORE_READINESS_MAX_AGE_MINUTES *
        60 *
        1000
  );
}


function constantTimeEqualHex(
  left,
  right
) {
  const a =
    String(left || "")
      .toLowerCase();

  const b =
    String(right || "")
      .toLowerCase();

  if (
    !/^[0-9a-f]{64}$/.test(a) ||
    !/^[0-9a-f]{64}$/.test(b)
  ) {
    return false;
  }

  let diff = 0;

  for (
    let index = 0;
    index < 64;
    index += 1
  ) {
    diff |=
      a.charCodeAt(index) ^
      b.charCodeAt(index);
  }

  return diff === 0;
}

async function getRestoreExecutionArmForDryRun(
  env,
  armId,
  armedBy
) {
  const normalizedArmId =
    normalizePositiveInteger(
      armId
    );

  const normalizedUserId =
    normalizePositiveInteger(
      armedBy
    );

  if (
    !normalizedArmId ||
    !normalizedUserId
  ) {
    return null;
  }

  await expireRestoreExecutionArms(
    env,
    normalizedUserId
  );

  return env.DB.prepare(`
    SELECT
      id,
      restore_request_id,
      readiness_id,
      status,
      execution_token_hash,
      armed_by,
      armed_at,
      expires_at,
      consumed_at,
      cancelled_at,
      created_at,
      updated_at
    FROM restore_execution_arms
    WHERE id = ?
      AND armed_by = ?
    LIMIT 1
  `)
    .bind(
      normalizedArmId,
      normalizedUserId
    )
    .first();
}


// =========================
// WATER CERTIFICATE STORAGE
// =========================

const WATER_CERTIFICATE_MAX_SIZE_BYTES =
  10 * 1024 * 1024;

function hasWaterCertificateStorage(
  env
) {

  return Boolean(
    env?.WATER_CERTIFICATES &&
    typeof env.WATER_CERTIFICATES.put ===
      "function" &&
    typeof env.WATER_CERTIFICATES.get ===
      "function"
  );
}

const WATER_CERTIFICATE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".edoc",
  ".asice",
];

const WATER_CERTIFICATE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
  "application/vnd.etsi.asic-e+zip",
  "application/vnd.etsi.asic-s+zip",
  "application/zip",
  "application/octet-stream",
];

function getCertificateFileExtension(
  fileName
) {

  const normalizedName =
    String(
      fileName || ""
    )
      .trim()
      .toLowerCase();

  const dotIndex =
    normalizedName.lastIndexOf(
      "."
    );

  if (dotIndex < 0) {
    return "";
  }

  return normalizedName.slice(
    dotIndex
  );
}

function sanitizeCertificateFileName(
  fileName
) {

  const originalName =
    String(
      fileName || "calibration-document.pdf"
    ).trim();

  const extension =
    getCertificateFileExtension(
      originalName
    );

  const safeExtension =
    WATER_CERTIFICATE_ALLOWED_EXTENSIONS
      .includes(extension)
      ? extension
      : ".pdf";

  const baseName =
    originalName
      .replace(
        /\.[^.]+$/,
        ""
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      ) ||
    "calibration-document";

  return `${baseName}${safeExtension}`;
}

function isAllowedCertificateFile({
  fileName,
  mimeType,
}) {

  const extension =
    getCertificateFileExtension(
      fileName
    );

  const normalizedType =
    String(
      mimeType || ""
    )
      .trim()
      .toLowerCase();

  if (
    !WATER_CERTIFICATE_ALLOWED_EXTENSIONS
      .includes(extension)
  ) {
    return false;
  }

  if (
    normalizedType &&
    !WATER_CERTIFICATE_ALLOWED_MIME_TYPES
      .includes(normalizedType)
  ) {
    return false;
  }

  return true;
}

function getStoredCertificateMimeType({
  fileName,
  mimeType,
}) {

  const extension =
    getCertificateFileExtension(
      fileName
    );

  const normalizedType =
    String(
      mimeType || ""
    )
      .trim()
      .toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".asice") {
    return (
      normalizedType ||
      "application/vnd.etsi.asic-e+zip"
    );
  }

  if (extension === ".edoc") {
    return (
      normalizedType ||
      "application/octet-stream"
    );
  }

  return (
    normalizedType ||
    "application/octet-stream"
  );
}

function buildWaterCertificateKey({
  apartmentId,
  meterId,
  calibrationDate,
  fileName,
}) {

  const safeApartmentId =
    Number(apartmentId);

  const safeMeterId =
    Number(meterId);

  const safeCalibrationDate =
    String(
      calibrationDate || ""
    )
      .trim()
      .replace(
        /[^0-9-]/g,
        ""
      ) ||
    new Date()
      .toISOString()
      .slice(0, 10);

  const uniqueId =
    crypto.randomUUID();

  const safeFileName =
    sanitizeCertificateFileName(
      fileName
    );

  return [
    "water-meters",
    `apartment-${safeApartmentId}`,
    `meter-${safeMeterId}`,
    "calibrations",
    `${safeCalibrationDate}-${uniqueId}-${safeFileName}`,
  ].join("/");
}


function isValidIsoDate(
  value
) {

  const normalized =
    String(
      value || ""
    ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${normalized}T00:00:00Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date.toISOString()
      .slice(0, 10) ===
      normalized
  );
}

function addMonthsToIsoDate(
  isoDate,
  months
) {

  const [
    year,
    month,
    day,
  ] =
    isoDate
      .split("-")
      .map(Number);

  const target =
    new Date(
      Date.UTC(
        year,
        month - 1 + months,
        1
      )
    );

  const lastDay =
    new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0
      )
    )
      .getUTCDate();

  target.setUTCDate(
    Math.min(
      day,
      lastDay
    )
  );

  return target
    .toISOString()
    .slice(0, 10);
}

// =========================
// ROUTES
// =========================

// =========================
// ANNOUNCEMENT HELPERS
// =========================

const ANNOUNCEMENT_TARGET_TYPES = [
  "all",
  "section",
  "apartment",
  "role",
  "user",
];

function normalizeAnnouncementDateTime(
  value
) {
  const normalized =
    String(
      value || ""
    ).trim();

  if (!normalized) {
    return null;
  }

  const date =
    new Date(
      normalized
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function normalizeAnnouncementStatus(
  value
) {
  const normalized =
    String(
      value || "draft"
    )
      .trim()
      .toLowerCase();

  return [
    "draft",
    "published",
    "archived",
  ].includes(normalized)
    ? normalized
    : null;
}

function normalizeAnnouncementPriority(
  value
) {
  const normalized =
    String(
      value || "normal"
    )
      .trim()
      .toLowerCase();

  return [
    "normal",
    "important",
  ].includes(normalized)
    ? normalized
    : null;
}

function normalizeAnnouncementTargets(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique =
    new Map();

  for (const item of value) {
    const type =
      String(
        item?.type || ""
      )
        .trim()
        .toLowerCase();

    if (
      !ANNOUNCEMENT_TARGET_TYPES
        .includes(type)
    ) {
      continue;
    }

    const rawValue =
      type === "all"
        ? null
        : String(
            item?.value ?? ""
          ).trim();

    if (
      type !== "all" &&
      !rawValue
    ) {
      continue;
    }

    if (
      [
        "apartment",
        "user",
      ].includes(type)
    ) {
      const numericValue =
        Number(rawValue);

      if (
        !Number.isInteger(
          numericValue
        ) ||
        numericValue <= 0
      ) {
        continue;
      }
    }

    const key =
      `${type}:${rawValue || ""}`;

    unique.set(
      key,
      {
        type,
        value: rawValue,
      }
    );
  }

  if (
    unique.has("all:")
  ) {
    return [
      {
        type: "all",
        value: null,
      },
    ];
  }

  return Array.from(
    unique.values()
  );
}

async function validateAnnouncementTargets(
  env,
  targets
) {
  if (
    !Array.isArray(targets) ||
    targets.length === 0
  ) {
    return {
      ok: false,
      error:
        "announcement_targets_required",
    };
  }

  for (const target of targets) {
    if (
      target.type === "all"
    ) {
      continue;
    }

    if (
      target.type === "section"
    ) {
      const found =
        await env.DB.prepare(`
          SELECT 1
          FROM apartments
          WHERE CAST(section AS TEXT) = ?
          LIMIT 1
        `)
          .bind(
            target.value
          )
          .first();

      if (!found) {
        return {
          ok: false,
          error:
            "invalid_announcement_section_target",
        };
      }
    }

    if (
      target.type === "apartment"
    ) {
      const found =
        await env.DB.prepare(`
          SELECT 1
          FROM apartments
          WHERE id = ?
          LIMIT 1
        `)
          .bind(
            Number(
              target.value
            )
          )
          .first();

      if (!found) {
        return {
          ok: false,
          error:
            "invalid_announcement_apartment_target",
        };
      }
    }

    if (
      target.type === "role"
    ) {
      const found =
        await env.DB.prepare(`
          SELECT 1
          FROM roles
          WHERE name = ?
          LIMIT 1
        `)
          .bind(
            target.value
          )
          .first();

      if (!found) {
        return {
          ok: false,
          error:
            "invalid_announcement_role_target",
        };
      }
    }

    if (
      target.type === "user"
    ) {
      const found =
        await env.DB.prepare(`
          SELECT 1
          FROM users
          WHERE id = ?
            AND is_active = 1
          LIMIT 1
        `)
          .bind(
            Number(
              target.value
            )
          )
          .first();

      if (!found) {
        return {
          ok: false,
          error:
            "invalid_announcement_user_target",
        };
      }
    }
  }

  return {
    ok: true,
  };
}

async function replaceAnnouncementTargets(
  env,
  announcementId,
  targets
) {
  const statements = [
    env.DB.prepare(`
      DELETE FROM announcement_targets
      WHERE announcement_id = ?
    `)
      .bind(
        announcementId
      ),
  ];

  for (const target of targets) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO announcement_targets (
          announcement_id,
          target_type,
          target_value
        )
        VALUES (?, ?, ?)
      `)
        .bind(
          announcementId,
          target.type,
          target.value
        )
    );
  }

  await env.DB.batch(
    statements
  );
}

async function getAnnouncementTargets(
  env,
  announcementId
) {
  const result =
    await env.DB.prepare(`
      SELECT
        target_type AS type,
        target_value AS value
      FROM announcement_targets
      WHERE announcement_id = ?
      ORDER BY
        CASE target_type
          WHEN 'all' THEN 0
          WHEN 'section' THEN 1
          WHEN 'apartment' THEN 2
          WHEN 'role' THEN 3
          WHEN 'user' THEN 4
          ELSE 5
        END,
        target_value
    `)
      .bind(
        announcementId
      )
      .all();

  return result.results || [];
}

async function attachAnnouncementTargets(
  env,
  announcements
) {
  const rows =
    Array.isArray(
      announcements
    )
      ? announcements
      : [];

  if (
    rows.length === 0
  ) {
    return rows;
  }

  const result =
    await env.DB.prepare(`
      SELECT
        announcement_id,
        target_type AS type,
        target_value AS value
      FROM announcement_targets
      ORDER BY
        announcement_id,
        target_type,
        target_value
    `)
      .all();

  const targetsMap =
    new Map();

  for (
    const target of
      result.results || []
  ) {
    if (
      !targetsMap.has(
        target.announcement_id
      )
    ) {
      targetsMap.set(
        target.announcement_id,
        []
      );
    }

    targetsMap.get(
      target.announcement_id
    ).push({
      type: target.type,
      value: target.value,
    });
  }

  return rows.map(
    (announcement) => ({
      ...announcement,
      targets:
        targetsMap.get(
          announcement.id
        ) || [],
    })
  );
}

function buildAnnouncementTargetUsers(
  rows
) {
  const sourceRows =
    Array.isArray(rows)
      ? rows
      : [];

  const usersById =
    new Map();

  for (
    const row of sourceRows
  ) {
    const userId =
      Number(row.id);

    if (
      !Number.isFinite(userId)
    ) {
      continue;
    }

    if (
      !usersById.has(userId)
    ) {
      usersById.set(
        userId,
        {
          id:
            userId,

          nick:
            String(
              row.nick || ""
            ).trim(),

          apartment_numbers:
            [],
        }
      );
    }

    const apartmentNumber =
      String(
        row.apartment_number || ""
      ).trim();

    if (
      apartmentNumber &&
      !usersById
        .get(userId)
        .apartment_numbers
        .includes(
          apartmentNumber
        )
    ) {
      usersById
        .get(userId)
        .apartment_numbers
        .push(
          apartmentNumber
        );
    }
  }

  return Array
    .from(
      usersById.values()
    )
    .map(
      (user) => ({
        ...user,

        apartment_numbers:
          [...user.apartment_numbers]
            .sort(
              (a, b) =>
                String(a)
                  .localeCompare(
                    String(b),
                    undefined,
                    {
                      numeric: true,
                      sensitivity:
                        "base",
                    }
                  )
            ),
      })
    )
    .sort(
      (a, b) => {
        const nickCompare =
          String(
            a.nick || ""
          ).localeCompare(
            String(
              b.nick || ""
            ),
            undefined,
            {
              numeric: true,
              sensitivity:
                "base",
            }
          );

        if (
          nickCompare !== 0
        ) {
          return nickCompare;
        }

        return (
          Number(a.id) -
          Number(b.id)
        );
      }
    );
}

async function getAnnouncementById(
  env,
  announcementId
) {
  const announcement =
    await env.DB.prepare(`
      SELECT
        a.id,
        a.title,
        a.content,
        a.status,
        a.priority,
        a.publish_from,
        a.publish_until,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.published_at,

        author.nick
          AS author_nick

      FROM announcements a

      LEFT JOIN users author
        ON author.id =
          a.created_by

      WHERE a.id = ?
    `)
      .bind(
        announcementId
      )
      .first();

  if (!announcement) {
    return null;
  }

  // Stage 2I-2E:
  // Admin announcement details use only pseudonymous author identity.
  // No PII_DB read or decryption is performed here.
  return {
    ...announcement,
    targets:
      await getAnnouncementTargets(
        env,
        announcementId
      ),
  };
}

function getAnnouncementTargetAccessSql() {
  return `
    EXISTS (
      SELECT 1
      FROM announcement_targets target
      WHERE target.announcement_id = a.id
        AND (
          target.target_type = 'all'

          OR (
            target.target_type = 'user'
            AND CAST(target.target_value AS INTEGER) = ?
          )

          OR (
            target.target_type = 'role'
            AND EXISTS (
              SELECT 1
              FROM user_roles ur
              JOIN roles r
                ON r.id = ur.role_id
              WHERE ur.user_id = ?
                AND r.name = target.target_value
            )
          )

          OR (
            target.target_type = 'apartment'
            AND EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id = ?
                AND ua.apartment_id =
                  CAST(
                    target.target_value
                    AS INTEGER
                  )
            )
          )

          OR (
            target.target_type = 'section'
            AND EXISTS (
              SELECT 1
              FROM user_apartments ua
              JOIN apartments apartment
                ON apartment.id =
                  ua.apartment_id
              WHERE ua.user_id = ?
                AND CAST(
                  apartment.section
                  AS TEXT
                ) =
                  target.target_value
            )
          )
        )
    )
  `;
}

// =========================
// RESIDENT ANNOUNCEMENTS
// Stage 2I-2A: no author PII is decrypted or returned.
// =========================
Router.register(
  "GET",
  "/api/announcements",
  async (ctx) => {
    const user =
      await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized"
      };
    }

    const nowIso =
      new Date().toISOString();

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          a.id,
          a.title,
          a.content,
          a.priority,
          a.publish_from,
          a.publish_until,
          a.published_at,
          a.created_at,
          a.updated_at

        FROM announcements a

        WHERE a.status = 'published'

          AND (
            a.publish_from IS NULL
            OR datetime(a.publish_from)
              <= datetime(?)
          )

          AND (
            a.publish_until IS NULL
            OR datetime(a.publish_until)
              >= datetime(?)
          )

          AND ${getAnnouncementTargetAccessSql()}

        ORDER BY
          CASE
            WHEN a.priority = 'important'
              THEN 0
            ELSE 1
          END,

          COALESCE(
            a.published_at,
            a.publish_from,
            a.created_at
          ) DESC,

          a.id DESC
      `)
        .bind(
          nowIso,
          nowIso,
          user.user_id,
          user.user_id,
          user.user_id,
          user.user_id
        )
        .all();

    return (result.results || []).map(
      (announcement) => ({
        ...announcement,
        author_label: "DzĪKS Irlava 20",
      })
    );
  }
);

// =========================
// RESIDENT ANNOUNCEMENT DETAILS
// Stage 2I-2A: no author PII is decrypted or returned.
// =========================
Router.register(
  "GET",
  "/api/announcement",
  async (ctx) => {
    const user =
      await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized"
      };
    }

    const announcementId =
      Number(
        ctx.url.searchParams.get(
          "id"
        )
      );

    if (
      !Number.isInteger(
        announcementId
      ) ||
      announcementId <= 0
    ) {
      return {
        error:
          "invalid_announcement_id"
      };
    }

    const nowIso =
      new Date().toISOString();

    const announcement =
      await ctx.env.DB.prepare(`
        SELECT
          a.id,
          a.title,
          a.content,
          a.priority,
          a.publish_from,
          a.publish_until,
          a.published_at,
          a.created_at,
          a.updated_at

        FROM announcements a

        WHERE a.id = ?
          AND a.status = 'published'

          AND (
            a.publish_from IS NULL
            OR datetime(a.publish_from)
              <= datetime(?)
          )

          AND (
            a.publish_until IS NULL
            OR datetime(a.publish_until)
              >= datetime(?)
          )

          AND ${getAnnouncementTargetAccessSql()}
      `)
        .bind(
          announcementId,
          nowIso,
          nowIso,
          user.user_id,
          user.user_id,
          user.user_id,
          user.user_id
        )
        .first();

    if (!announcement) {
      return {
        error:
          "announcement_not_found"
      };
    }

    return {
      ...announcement,
      author_label: "DzĪKS Irlava 20",
    };
  }
);

// =========================
// ADMIN ANNOUNCEMENT TARGET OPTIONS
// =========================
Router.register(
  "GET",
  "/api/admin/announcement-target-options",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const [
      sectionsResult,
      apartmentsResult,
      rolesResult,
      usersResult,
    ] =
      await Promise.all([
        ctx.env.DB.prepare(`
          SELECT DISTINCT
            CAST(section AS TEXT) AS value
          FROM apartments
          WHERE section IS NOT NULL
            AND TRIM(
              CAST(section AS TEXT)
            ) <> ''
          ORDER BY
            CAST(section AS INTEGER),
            section
        `).all(),

        ctx.env.DB.prepare(`
          SELECT
            id,
            number,
            section
          FROM apartments
          ORDER BY number
        `).all(),

        ctx.env.DB.prepare(`
          SELECT
            id,
            name
          FROM roles
          ORDER BY name
        `).all(),

        ctx.env.DB.prepare(`
          SELECT DISTINCT
            u.id,
            u.nick,
            a.number
              AS apartment_number

          FROM users u

          LEFT JOIN user_apartments ua
            ON ua.user_id = u.id

          LEFT JOIN apartments a
            ON a.id = ua.apartment_id

          WHERE u.is_active = 1

          ORDER BY
            u.nick COLLATE NOCASE,
            u.id,
            CAST(
              a.number AS INTEGER
            ),
            a.number
        `).all(),
      ]);

    // Stage 2I-2B2:
    // announcement target selection uses only
    // pseudonymous Main D1 data (Nick + Apartment).
    // No PII_DB read or decryption is performed here.
    const users =
      buildAnnouncementTargetUsers(
        usersResult.results || []
      );

    return {
      ok: true,
      sections:
        sectionsResult.results || [],
      apartments:
        apartmentsResult.results || [],
      roles:
        rolesResult.results || [],
      users,
    };
  }
);

// =========================
// ADMIN ANNOUNCEMENTS
// =========================
Router.register(
  "GET",
  "/api/admin/announcements",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          a.id,
          a.title,
          a.content,
          a.status,
          a.priority,
          a.publish_from,
          a.publish_until,
          a.created_by,
          a.created_at,
          a.updated_at,
          a.published_at,

          author.nick
            AS author_nick

        FROM announcements a

        LEFT JOIN users author
          ON author.id =
            a.created_by

        ORDER BY
          CASE a.status
            WHEN 'published'
              THEN 0
            WHEN 'draft'
              THEN 1
            ELSE 2
          END,

          a.updated_at DESC,
          a.id DESC
      `)
        .all();

    // Stage 2I-2E:
    // Admin announcement list uses only pseudonymous author identity.
    // No PII_DB read or decryption is performed here.
    return await attachAnnouncementTargets(
      ctx.env,
      result.results || []
    );
  }
);

// =========================
// ADMIN CREATE ANNOUNCEMENT
// =========================
Router.register(
  "POST",
  "/api/admin/announcements",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const title =
      String(
        body.title || ""
      ).trim();

    const content =
      String(
        body.content || ""
      ).trim();

    const priority =
      normalizeAnnouncementPriority(
        body.priority
      );

    const requestedStatus =
      normalizeAnnouncementStatus(
        body.status
      );

    const targets =
      normalizeAnnouncementTargets(
        body.targets
      );

    if (!title) {
      return {
        error:
          "missing_announcement_title"
      };
    }

    if (!content) {
      return {
        error:
          "missing_announcement_content"
      };
    }

    if (!priority) {
      return {
        error:
          "invalid_announcement_priority"
      };
    }

    if (
      !requestedStatus ||
      requestedStatus ===
        "archived"
    ) {
      return {
        error:
          "invalid_announcement_status"
      };
    }

    const targetValidation =
      await validateAnnouncementTargets(
        ctx.env,
        targets
      );

    if (!targetValidation.ok) {
      return {
        error:
          targetValidation.error
      };
    }

    const rawPublishFrom =
      String(
        body.publish_from || ""
      ).trim();

    const rawPublishUntil =
      String(
        body.publish_until || ""
      ).trim();

    const publishFrom =
      rawPublishFrom
        ? normalizeAnnouncementDateTime(
            rawPublishFrom
          )
        : null;

    const publishUntil =
      rawPublishUntil
        ? normalizeAnnouncementDateTime(
            rawPublishUntil
          )
        : null;

    if (
      rawPublishFrom &&
      !publishFrom
    ) {
      return {
        error:
          "invalid_publish_from"
      };
    }

    if (
      rawPublishUntil &&
      !publishUntil
    ) {
      return {
        error:
          "invalid_publish_until"
      };
    }

    if (
      publishFrom &&
      publishUntil &&
      new Date(publishUntil) <
        new Date(publishFrom)
    ) {
      return {
        error:
          "publish_until_before_publish_from"
      };
    }

    const nowIso =
      new Date().toISOString();

    const publishedAt =
      requestedStatus ===
        "published"
        ? nowIso
        : null;

    const result =
      await ctx.env.DB.prepare(`
        INSERT INTO announcements (
          title,
          content,
          status,
          priority,
          publish_from,
          publish_until,
          created_by,
          created_at,
          updated_at,
          published_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `)
        .bind(
          title,
          content,
          requestedStatus,
          priority,
          publishFrom,
          publishUntil,
          admin.user_id,
          nowIso,
          nowIso,
          publishedAt
        )
        .run();

    const announcementId =
      result.meta.last_row_id;

    await replaceAnnouncementTargets(
      ctx.env,
      announcementId,
      targets
    );

    let push_delivery = null;

    if (
      requestedStatus ===
        "published" &&
      priority ===
        "important"
    ) {
      push_delivery =
        await sendUrgentAnnouncementPushes(
          ctx.env,
          announcementId
        );
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.announcement_create",
        targetType:
          "announcement",
        targetId:
          String(
            announcementId
          ),
        details: {
          status:
            requestedStatus,
          priority,
          urgent_push_requested:
            requestedStatus ===
              "published" &&
            priority ===
              "important",
        },
      }
    );

    return {
      ok: true,
      push_delivery,
      announcement:
        await getAnnouncementById(
          ctx.env,
          announcementId
        ),
    };
  }
);

// =========================
// ADMIN UPDATE ANNOUNCEMENT
// =========================
Router.register(
  "POST",
  "/api/admin/update-announcement",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const announcementId =
      Number(
        body.id
      );

    if (
      !Number.isInteger(
        announcementId
      ) ||
      announcementId <= 0
    ) {
      return {
        error:
          "invalid_announcement_id"
      };
    }

    const existing =
      await getAnnouncementById(
        ctx.env,
        announcementId
      );

    if (!existing) {
      return {
        error:
          "announcement_not_found"
      };
    }

    if (
      existing.status ===
        "archived"
    ) {
      return {
        error:
          "archived_announcement_cannot_be_updated"
      };
    }

    const title =
      String(
        body.title ?? existing.title
      ).trim();

    const content =
      String(
        body.content ??
          existing.content
      ).trim();

    const priority =
      normalizeAnnouncementPriority(
        body.priority ??
          existing.priority
      );

    const targets =
      Object.prototype
        .hasOwnProperty.call(
          body,
          "targets"
        )
        ? normalizeAnnouncementTargets(
            body.targets
          )
        : existing.targets;

    if (!title) {
      return {
        error:
          "missing_announcement_title"
      };
    }

    if (!content) {
      return {
        error:
          "missing_announcement_content"
      };
    }

    if (!priority) {
      return {
        error:
          "invalid_announcement_priority"
      };
    }

    const targetValidation =
      await validateAnnouncementTargets(
        ctx.env,
        targets
      );

    if (!targetValidation.ok) {
      return {
        error:
          targetValidation.error
      };
    }

    const hasPublishFrom =
      Object.prototype
        .hasOwnProperty.call(
          body,
          "publish_from"
        );

    const hasPublishUntil =
      Object.prototype
        .hasOwnProperty.call(
          body,
          "publish_until"
        );

    const rawPublishFrom =
      hasPublishFrom
        ? String(
            body.publish_from || ""
          ).trim()
        : "";

    const rawPublishUntil =
      hasPublishUntil
        ? String(
            body.publish_until || ""
          ).trim()
        : "";

    const publishFrom =
      hasPublishFrom
        ? (
            rawPublishFrom
              ? normalizeAnnouncementDateTime(
                  rawPublishFrom
                )
              : null
          )
        : existing.publish_from;

    const publishUntil =
      hasPublishUntil
        ? (
            rawPublishUntil
              ? normalizeAnnouncementDateTime(
                  rawPublishUntil
                )
              : null
          )
        : existing.publish_until;

    if (
      hasPublishFrom &&
      rawPublishFrom &&
      !publishFrom
    ) {
      return {
        error:
          "invalid_publish_from"
      };
    }

    if (
      hasPublishUntil &&
      rawPublishUntil &&
      !publishUntil
    ) {
      return {
        error:
          "invalid_publish_until"
      };
    }

    if (
      publishFrom &&
      publishUntil &&
      new Date(publishUntil) <
        new Date(publishFrom)
    ) {
      return {
        error:
          "publish_until_before_publish_from"
      };
    }

    const nowIso =
      new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE announcements
      SET
        title = ?,
        content = ?,
        priority = ?,
        publish_from = ?,
        publish_until = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        title,
        content,
        priority,
        publishFrom,
        publishUntil,
        nowIso,
        announcementId
      )
      .run();

    await replaceAnnouncementTargets(
      ctx.env,
      announcementId,
      targets
    );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.announcement_update",
        targetType:
          "announcement",
        targetId:
          String(
            announcementId
          ),
        details: {
          priority,
        },
      }
    );

    return {
      ok: true,
      announcement:
        await getAnnouncementById(
          ctx.env,
          announcementId
        ),
    };
  }
);

// =========================
// ADMIN PUBLISH ANNOUNCEMENT
// =========================
Router.register(
  "POST",
  "/api/admin/publish-announcement",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const announcementId =
      Number(
        body.id
      );

    if (
      !Number.isInteger(
        announcementId
      ) ||
      announcementId <= 0
    ) {
      return {
        error:
          "invalid_announcement_id"
      };
    }

    const existing =
      await getAnnouncementById(
        ctx.env,
        announcementId
      );

    if (!existing) {
      return {
        error:
          "announcement_not_found"
      };
    }

    if (
      existing.status ===
        "archived"
    ) {
      return {
        error:
          "archived_announcement_cannot_be_published"
      };
    }

    if (
      !Array.isArray(
        existing.targets
      ) ||
      existing.targets.length === 0
    ) {
      return {
        error:
          "announcement_targets_required"
      };
    }

    const nowIso =
      new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE announcements
      SET
        status = 'published',
        published_at =
          COALESCE(
            published_at,
            ?
          ),
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        nowIso,
        nowIso,
        announcementId
      )
      .run();

    const publishedAnnouncement =
      await getAnnouncementById(
        ctx.env,
        announcementId
      );

    const push_delivery =
      publishedAnnouncement
        ?.priority ===
          "important"
        ? await sendUrgentAnnouncementPushes(
            ctx.env,
            announcementId
          )
        : null;

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.announcement_publish",
        targetType:
          "announcement",
        targetId:
          String(
            announcementId
          ),
        details: {
          priority:
            publishedAnnouncement
              ?.priority ||
            null,
          urgent_push_requested:
            publishedAnnouncement
              ?.priority ===
            "important",
        },
      }
    );

    return {
      ok: true,
      push_delivery,
      announcement:
        await getAnnouncementById(
          ctx.env,
          announcementId
        ),
    };
  }
);

// =========================
// ADMIN ARCHIVE ANNOUNCEMENT
// =========================
Router.register(
  "POST",
  "/api/admin/archive-announcement",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const announcementId =
      Number(
        body.id
      );

    if (
      !Number.isInteger(
        announcementId
      ) ||
      announcementId <= 0
    ) {
      return {
        error:
          "invalid_announcement_id"
      };
    }

    const existing =
      await getAnnouncementById(
        ctx.env,
        announcementId
      );

    if (!existing) {
      return {
        error:
          "announcement_not_found"
      };
    }

    if (
      existing.status ===
        "archived"
    ) {
      return {
        ok: true,
        announcement:
          existing,
      };
    }

    const nowIso =
      new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE announcements
      SET
        status = 'archived',
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        nowIso,
        announcementId
      )
      .run();

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.announcement_archive",
        targetType:
          "announcement",
        targetId:
          String(
            announcementId
          ),
      }
    );

    return {
      ok: true,
      announcement:
        await getAnnouncementById(
          ctx.env,
          announcementId
        ),
    };
  }
);

// =========================
// ADMIN WATER CERTIFICATE STORAGE STATUS
// =========================
Router.register(
  "GET",
  "/api/admin/water-certificates-storage-status",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const available =
      hasWaterCertificateStorage(
        ctx.env
      );

    return {
      ok: available,

      storage:
        "WATER_CERTIFICATES",

      available,

      max_file_size_bytes:
        WATER_CERTIFICATE_MAX_SIZE_BYTES,

      allowed_extensions:
        WATER_CERTIFICATE_ALLOWED_EXTENSIONS,

      allowed_mime_types:
        WATER_CERTIFICATE_ALLOWED_MIME_TYPES,

      key_example:
        buildWaterCertificateKey({
          apartmentId: 21,
          meterId: 123,
          calibrationDate:
            "2026-07-15",
          fileName:
            "calibration-certificate.pdf",
        }),
    };
  }
);


// =========================
// ADMIN UPLOAD WATER METER CERTIFICATE
// =========================
Router.register(
  "POST",
  "/api/admin/water-meter-certificate",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    if (
      !hasWaterCertificateStorage(
        ctx.env
      )
    ) {
      return {
        error:
          "water_certificate_storage_unavailable"
      };
    }

    const contentType =
      ctx.request.headers.get(
        "Content-Type"
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "multipart/form-data"
        )
    ) {
      return {
        error:
          "multipart_form_data_required"
      };
    }

    const formData =
      await ctx.request
        .formData()
        .catch(() => null);

    if (!formData) {
      return {
        error:
          "invalid_form_data"
      };
    }

    const meterId =
      Number(
        formData.get(
          "meter_id"
        )
      );

    const calibrationDate =
      String(
        formData.get(
          "calibration_date"
        ) || ""
      ).trim();

    const validityMonths =
      Number(
        formData.get(
          "validity_months"
        ) || 12
      );

    const notes =
      String(
        formData.get(
          "notes"
        ) || ""
      ).trim();

    const certificateNumber =
      String(
        formData.get(
          "certificate_number"
        ) || ""
      ).trim();

    const calibrationLaboratory =
      String(
        formData.get(
          "calibration_laboratory"
        ) || ""
      ).trim();

    const certificate =
      formData.get(
        "certificate"
      );

    if (
      !Number.isInteger(
        meterId
      ) ||
      meterId <= 0
    ) {
      return {
        error:
          "invalid_meter_id"
      };
    }

    if (
      !isValidIsoDate(
        calibrationDate
      )
    ) {
      return {
        error:
          "invalid_calibration_date"
      };
    }

    if (
      !Number.isInteger(
        validityMonths
      ) ||
      validityMonths <= 0 ||
      validityMonths > 120
    ) {
      return {
        error:
          "invalid_validity_months"
      };
    }

    if (
      !(certificate instanceof File)
    ) {
      return {
        error:
          "certificate_file_required"
      };
    }

    if (
      certificate.size <= 0
    ) {
      return {
        error:
          "certificate_file_empty"
      };
    }

    if (
      certificate.size >
      WATER_CERTIFICATE_MAX_SIZE_BYTES
    ) {
      return {
        error:
          "certificate_file_too_large"
      };
    }

    if (
      !isAllowedCertificateFile({
        fileName:
          certificate.name,

        mimeType:
          certificate.type,
      })
    ) {
      return {
        error:
          "invalid_certificate_file_type",

        allowed_extensions:
          WATER_CERTIFICATE_ALLOWED_EXTENSIONS
      };
    }

    const meter =
      await ctx.env.DB.prepare(`
        SELECT
          wm.id,
          wm.apartment_id,
          wm.serial_number,
          wm.active,
          a.number AS apartment_number

        FROM water_meters wm

        JOIN apartments a
          ON a.id =
            wm.apartment_id

        WHERE wm.id = ?
      `)
        .bind(
          meterId
        )
        .first();

    if (!meter) {
      return {
        error:
          "water_meter_not_found"
      };
    }

    const expiresAt =
      addMonthsToIsoDate(
        calibrationDate,
        validityMonths
      );

    const safeFileName =
      sanitizeCertificateFileName(
        certificate.name
      );

    const storedMimeType =
      getStoredCertificateMimeType({
        fileName:
          safeFileName,

        mimeType:
          certificate.type,
      });

    const contentDisposition =
      getCertificateFileExtension(
        safeFileName
      ) === ".pdf"
        ? `inline; filename="${safeFileName}"`
        : `attachment; filename="${safeFileName}"`;

    const objectKey =
      buildWaterCertificateKey({
        apartmentId:
          meter.apartment_id,

        meterId:
          meter.id,

        calibrationDate,

        fileName:
          safeFileName,
      });

    let objectStored = false;

    try {

      await ctx.env
        .WATER_CERTIFICATES
        .put(
          objectKey,
          certificate.stream(),
          {
            httpMetadata: {
              contentType:
                storedMimeType,

              contentDisposition,
            },

            customMetadata: {
              meter_id:
                String(
                  meter.id
                ),

              apartment_id:
                String(
                  meter.apartment_id
                ),

              calibration_date:
                calibrationDate,

              expires_at:
                expiresAt,

              uploaded_by:
                String(
                  admin.user_id
                ),
            },
          }
        );

      objectStored = true;

      const insertResult =
        await ctx.env.DB.prepare(`
          INSERT INTO water_meter_calibrations (
            meter_id,
            calibration_date,
            validity_months,
            expires_at,
            certificate_file_key,
            certificate_file_name,
            certificate_mime_type,
            certificate_size_bytes,
            uploaded_by,
            notes,
            certificate_number,
            calibration_laboratory
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `)
          .bind(
            meter.id,
            calibrationDate,
            validityMonths,
            expiresAt,
            objectKey,
            safeFileName,
            storedMimeType,
            certificate.size,
            admin.user_id,
            notes || null,
            certificateNumber || null,
            calibrationLaboratory || null
          )
          .run();

      return {
        ok: true,

        calibration_id:
          insertResult.meta
            .last_row_id,

        meter_id:
          meter.id,

        apartment_id:
          meter.apartment_id,

        apartment_number:
          meter.apartment_number,

        calibration_date:
          calibrationDate,

        validity_months:
          validityMonths,

        expires_at:
          expiresAt,

        certificate_number:
          certificateNumber || null,

        calibration_laboratory:
          calibrationLaboratory || null,

        certificate: {
          file_name:
            safeFileName,

          mime_type:
            storedMimeType,

          size_bytes:
            certificate.size,
        },
      };

    } catch (error) {

      console.error(
        "UPLOAD WATER METER CERTIFICATE ERROR:",
        error
      );

      if (objectStored) {

        try {

          await ctx.env
            .WATER_CERTIFICATES
            .delete(
              objectKey
            );

        } catch (
          cleanupError
        ) {

          console.error(
            "CERTIFICATE CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      throw error;
    }
  }
);


// =========================
// CHANGE PASSWORD
// =========================
Router.register(
  "POST",
  "/api/change-password",
  async (ctx) => {
    const authenticatedUser =
      await Auth.requireUser(ctx);

    if (!authenticatedUser) {
      return { error: "unauthorized" };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const currentPassword =
      String(
        body.current_password || ""
      );

    const newPassword =
      String(
        body.new_password || ""
      );

    if (
      !currentPassword ||
      !newPassword
    ) {
      return {
        error:
          "missing_password_fields"
      };
    }

    if (
      newPassword.length < 8
    ) {
      return {
        error:
          "new_password_too_short"
      };
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return {
        error:
          "new_password_same_as_current"
      };
    }

    const user =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          password_hash,
          is_active
        FROM users
        WHERE id = ?
      `)
        .bind(
          authenticatedUser.user_id
        )
        .first();

    if (
      !user ||
      Number(user.is_active) !== 1
    ) {
      return {
        error:
          "user_not_found_or_inactive"
      };
    }

    const passwordLimitKey =
      `user:${authenticatedUser.user_id}`;

    const passwordLimitCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "change-password-failure",
        key:
          passwordLimitKey,
        windowSeconds:
          PASSWORD_CHANGE_FAILURE_LIMIT
            .windowSeconds,
      });

    if (!passwordLimitCheck.allowed) {
      return SecurityRateLimit.response(
        passwordLimitCheck
      );
    }

    const currentPasswordCheck =
      await verifyPassword(
        currentPassword,
        user.password_hash || ""
      );

    if (!currentPasswordCheck.ok) {
      const failureResult =
        await SecurityRateLimit.recordFailure({
          env: ctx.env,
          scope:
            "change-password-failure",
          key:
            passwordLimitKey,
          ...PASSWORD_CHANGE_FAILURE_LIMIT,
        });

      if (!failureResult.allowed) {
        return SecurityRateLimit.response(
          failureResult
        );
      }

      return {
        error:
          "current_password_incorrect"
      };
    }

    await SecurityRateLimit.clear({
      env: ctx.env,
      scope:
        "change-password-failure",
      key:
        passwordLimitKey,
    });

    const newPasswordHash =
      await hashPassword(
        newPassword
      );

    await ctx.env.DB.prepare(`
      UPDATE users
      SET
        password_hash = ?,
        must_change_password = 0
      WHERE id = ?
        AND is_active = 1
    `)
      .bind(
        newPasswordHash,
        user.id
      )
      .run();

    const revokedAt =
      new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
    `)
      .bind(
        revokedAt,
        user.id
      )
      .run();

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          authenticatedUser.user_id,
        action:
          "auth.password_change",
        targetType:
          "user",
        targetId:
          String(user.id),
        details: {
          sessions_revoked: true,
        },
      }
    );

    return {
      ok: true,
      must_change_password: 0,
      sessions_revoked: true
    };
  }
);

// LOGIN
// Stage 2I-SR7:
// - per-IP request throttling
// - per-IP and per-Nick failed-login throttling
// - no raw IP/Nick stored in limiter table
// - unknown Nick takes the same PBKDF2 verification path
Router.register("POST", "/api/login", async (ctx) => {
  try {
    const clientIp =
      SecurityRateLimit.clientIp(
        ctx.request
      );

    const requestLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "login-request-ip",
        key:
          clientIp,
        ...LOGIN_REQUEST_IP_LIMIT,
      });

    if (!requestLimit.allowed) {
      return SecurityRateLimit.response(
        requestLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const nickInput =
      String(
        body?.nick || ""
      ).trim();

    if (
      !nickInput ||
      !body?.password
    ) {
      return {
        error: "missing_fields"
      };
    }

    const normalizedNick =
      SecurityRateLimit
        .normalizeLoginIdentifier(
          nickInput
        );

    const ipFailureCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "login-failure-ip",
        key:
          clientIp,
        windowSeconds:
          LOGIN_FAILURE_IP_LIMIT
            .windowSeconds,
      });

    if (!ipFailureCheck.allowed) {
      return SecurityRateLimit.response(
        ipFailureCheck
      );
    }

    const accountFailureCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "login-failure-account",
        key:
          normalizedNick,
        windowSeconds:
          LOGIN_FAILURE_ACCOUNT_LIMIT
            .windowSeconds,
      });

    if (!accountFailureCheck.allowed) {
      return SecurityRateLimit.response(
        accountFailureCheck
      );
    }

    const user =
      await findUserForLogin(
        ctx.env,
        body
      );

    const password =
      String(
        body.password || ""
      );

    const passwordCheck =
      await verifyPassword(
        password,
        user?.password_hash ||
          LOGIN_DUMMY_PASSWORD_HASH
      );

    if (
      !user ||
      !passwordCheck.ok
    ) {
      const [
        ipFailureResult,
        accountFailureResult,
      ] = await Promise.all([
        SecurityRateLimit
          .recordFailure({
            env: ctx.env,
            scope:
              "login-failure-ip",
            key:
              clientIp,
            ...LOGIN_FAILURE_IP_LIMIT,
          }),

        SecurityRateLimit
          .recordFailure({
            env: ctx.env,
            scope:
              "login-failure-account",
            key:
              normalizedNick,
            ...LOGIN_FAILURE_ACCOUNT_LIMIT,
          }),
      ]);

      if (
        !ipFailureResult.allowed ||
        !accountFailureResult.allowed
      ) {
        const retryAfter =
          Math.max(
            Number(
              ipFailureResult
                .retry_after_seconds ||
              0
            ),
            Number(
              accountFailureResult
                .retry_after_seconds ||
              0
            ),
            1
          );

        return SecurityRateLimit.response({
          retry_after_seconds:
            retryAfter,
        });
      }

      await SecurityAudit.recordSafe(
        ctx,
        {
          action:
            "auth.login",
          result:
            "failure",
          details: {
            failure_type:
              "invalid_credentials",
          },
        }
      );

      return {
        error:
          "invalid_credentials"
      };
    }

    await Promise.all([
      SecurityRateLimit.clear({
        env: ctx.env,
        scope:
          "login-failure-ip",
        key:
          clientIp,
      }),

      SecurityRateLimit.clear({
        env: ctx.env,
        scope:
          "login-failure-account",
        key:
          normalizedNick,
      }),
    ]);

    // Stage 2I-SR3:
    // Successful login transparently upgrades the legacy unsalted
    // SHA-256 password hash to PBKDF2-HMAC-SHA256.
    if (
      passwordCheck.needs_rehash
    ) {
      try {
        const upgradedHash =
          await hashPassword(
            password
          );

        await ctx.env.DB.prepare(`
          UPDATE users
          SET
            password_hash = ?,
            updated_at = ?
          WHERE id = ?
            AND password_hash = ?
        `)
          .bind(
            upgradedHash,
            new Date().toISOString(),
            user.id,
            user.password_hash
          )
          .run();

      } catch (migrationError) {
        console.error(
          "PASSWORD HASH MIGRATION ERROR:",
          {
            user_id:
              user.id,
            error:
              String(
                migrationError?.message ||
                migrationError
              ),
          }
        );
      }
    }

    const sessionId =
      crypto.randomUUID();

    const sessionExpiresAt =
      new Date(
        (
          Math.floor(
            Date.now() / 1000
          ) +
          JWT_TTL_SECONDS
        ) * 1000
      ).toISOString();

    await ctx.env.DB.prepare(`
      INSERT INTO auth_sessions (
        session_id,
        user_id,
        expires_at
      )
      VALUES (?, ?, ?)
    `)
      .bind(
        sessionId,
        Number(user.id),
        sessionExpiresAt
      )
      .run();

    const token = await signJWT(
      {
        user_id:
          Number(user.id),
        nick:
          user.nick || null,
        session_id:
          sessionId,
      },
      ctx.env.JWT_SECRET
    );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          user.id,
        action:
          "auth.login",
        targetType:
          "session",
        targetId:
          sessionId,
      }
    );

    return { token };

  } catch (e) {
    App.logError(
      "login_error",
      e
    );

    return {
      error: "login_crash",
    };
  }
});

// LOGOUT
// Stage 2I-SR10:
// Revoke only the current server-side session.
Router.register(
  "POST",
  "/api/logout",
  async (ctx) => {
    const authenticatedUser =
      await Auth.requireUser(ctx);

    if (!authenticatedUser) {
      return {
        error: "unauthorized"
      };
    }

    const revokedAt =
      new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE session_id = ?
        AND user_id = ?
        AND revoked_at IS NULL
    `)
      .bind(
        revokedAt,
        authenticatedUser.session_id,
        authenticatedUser.user_id
      )
      .run();

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          authenticatedUser.user_id,
        action:
          "auth.logout",
        targetType:
          "session",
        targetId:
          authenticatedUser.session_id,
      }
    );

    return {
      ok: true
    };
  }
);

// ME
// Stage 2G-6: Main D1 provides only non-PII account state.
// PII is read exclusively from PII_DB.
Router.register("GET", "/api/me", async (ctx) => {
  const u = await Auth.requireUser(ctx);
  if (!u) return { error: "unauthorized" };

  const user = await ctx.env.DB.prepare(`
    SELECT
      id,
      nick,
      must_change_password
    FROM users
    WHERE id = ?
  `)
    .bind(
      u.user_id
    )
    .first();

  if (!user) {
    return {
      error: "user_not_found"
    };
  }

  return {
    user,
    roles: u.roles || []
  };
});

// APARTMENTS
Router.register("GET", "/api/my-apartments", async (ctx) => {
  const u = await Auth.requireUser(ctx);
  if (!u) return { error: "unauthorized" };

  const r = await ctx.env.DB.prepare(`
    SELECT a.*, ua.relation_type
    FROM apartments a
    JOIN user_apartments ua ON ua.apartment_id = a.id
    WHERE ua.user_id = ?
  `).bind(u.user_id).all();

  return r.results;
});

// ADMIN USERS
// Stage 2I-5A3E v4:
// Main list is deliberately non-PII.
// No bulk PII decrypt is performed here.
Router.register("GET", "/api/admin/users", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const r =
    await ctx.env.DB.prepare(`
      SELECT
        u.id,
        u.nick,
        u.is_active,
        u.created_at,
        u.updated_at,

        GROUP_CONCAT(
          CASE
            WHEN ua.relation_type = 'owner'
            THEN CAST(a.number AS TEXT)
          END,
          ', '
        ) AS owner_apartments,

        GROUP_CONCAT(
          CASE
            WHEN ua.relation_type = 'resident'
            THEN CAST(a.number AS TEXT)
          END,
          ', '
        ) AS resident_apartments

      FROM users u

      LEFT JOIN user_apartments ua
        ON ua.user_id = u.id

      LEFT JOIN apartments a
        ON a.id = ua.apartment_id

      GROUP BY u.id
      ORDER BY u.id
    `)
      .all();

  return r.results || [];
});

// ADMIN USER DETAIL
// Stage 2I-5A3E v4:
// Decrypt PII for exactly one explicitly requested user.
Router.register(
  "GET",
  "/api/admin/user",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const piiDetailLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-pii-detail",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_PII_DETAIL_LIMIT,
      });

    if (!piiDetailLimit.allowed) {
      return SecurityRateLimit.response(
        piiDetailLimit
      );
    }

    const userId =
      Number(
        ctx.url.searchParams.get(
          "id"
        )
      );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return {
        error: "invalid_user_id"
      };
    }

    const row =
      await ctx.env.DB.prepare(`
        SELECT
          u.id,
          u.nick,
          u.is_active,
          u.created_at,
          u.updated_at,

          GROUP_CONCAT(
            CASE
              WHEN ua.relation_type = 'owner'
              THEN CAST(a.number AS TEXT)
            END,
            ', '
          ) AS owner_apartments,

          GROUP_CONCAT(
            CASE
              WHEN ua.relation_type = 'resident'
              THEN CAST(a.number AS TEXT)
            END,
            ', '
          ) AS resident_apartments

        FROM users u

        LEFT JOIN user_apartments ua
          ON ua.user_id = u.id

        LEFT JOIN apartments a
          ON a.id = ua.apartment_id

        WHERE u.id = ?

        GROUP BY u.id
        LIMIT 1
      `)
        .bind(userId)
        .first();

    if (!row) {
      return {
        error: "user_not_found"
      };
    }

    const pii =
      await PiiStore.getUserPii(
        userId,
        ctx.env
      );

    if (!pii) {
      return {
        error: "user_pii_not_found"
      };
    }

    try {
      await PiiAudit.record(
        {
          actorUserId:
            admin.user_id,
          subjectUserId:
            userId,
          action:
            "read_single",
          endpoint:
            "/api/admin/user",
          fields: [
            "first_name",
            "last_name",
            "email",
            "phone",
          ],
          subjectCount: 1,
        },
        ctx.env
      );
    } catch (error) {
      console.error(
        "PII audit write failed for /api/admin/user",
        {
          actor_user_id:
            admin.user_id,
          subject_user_id:
            userId,
          error:
            String(
              error?.message ||
              error
            ),
        }
      );

      return {
        error:
          "pii_audit_failed",
      };
    }

    return {
      id:
        row.id,
      nick:
        row.nick,
      email:
        pii.email ?? null,
      first_name:
        pii.first_name ?? null,
      last_name:
        pii.last_name ?? null,
      phone:
        pii.phone ?? null,
      is_active:
        row.is_active,
      created_at:
        row.created_at,
      updated_at:
        row.updated_at,
      owner_apartments:
        row.owner_apartments,
      resident_apartments:
        row.resident_apartments,
    };
  }
);

// =========================
// ADMIN USER PII SEARCH
// Stage 2I-5A3C:
// HMAC bigram lookup first, decrypt candidates only,
// then verify plaintext substring in Worker memory.
// =========================
Router.register(
  "GET",
  "/api/admin/search-users",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const piiSearchLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-pii-search",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_PII_SEARCH_LIMIT,
      });

    if (!piiSearchLimit.allowed) {
      return SecurityRateLimit.response(
        piiSearchLimit
      );
    }

    const query =
      String(
        ctx.url.searchParams.get(
          "q"
        ) || ""
      ).trim();

    const candidateResult =
      await PiiSearch.findCandidateUserIds(
        query,
        ctx.env
      );

    if (!candidateResult.ok) {
      return {
        error:
          candidateResult.error
      };
    }

    const candidateIds =
      candidateResult.user_ids;

    if (
      candidateIds.length === 0
    ) {
      return [];
    }

    const piiMap =
      await PiiStore.getUsersPii(
        candidateIds,
        ctx.env
      );

    const matchedIds = [];

    for (
      const [
        userId,
        pii,
      ] of piiMap.entries()
    ) {
      if (
        PiiSearch.matchesPlaintext(
          pii,
          candidateResult.normalized
        )
      ) {
        matchedIds.push(
          Number(userId)
        );
      }
    }

    if (matchedIds.length === 0) {
      return [];
    }

    const placeholders =
      matchedIds
        .map(() => "?")
        .join(", ");

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          u.id,
          u.nick,
          u.is_active,
          u.created_at,
          u.updated_at,

          GROUP_CONCAT(
            CASE
              WHEN ua.relation_type =
                'owner'
              THEN CAST(
                a.number AS TEXT
              )
            END,
            ', '
          ) AS owner_apartments,

          GROUP_CONCAT(
            CASE
              WHEN ua.relation_type =
                'resident'
              THEN CAST(
                a.number AS TEXT
              )
            END,
            ', '
          ) AS resident_apartments

        FROM users u

        LEFT JOIN user_apartments ua
          ON ua.user_id = u.id

        LEFT JOIN apartments a
          ON a.id =
            ua.apartment_id

        WHERE u.id IN (
          ${placeholders}
        )

        GROUP BY u.id

        ORDER BY u.id
      `)
        .bind(
          ...matchedIds
        )
        .all();

    const rows =
      result.results || [];

    const response =
      rows
        .map(
          (row) => {
            const pii =
              piiMap.get(
                Number(row.id)
              );

            return {
              id:
                row.id,

              nick:
                row.nick,

              email:
                pii?.email ?? null,

              first_name:
                pii?.first_name ?? null,

              last_name:
                pii?.last_name ?? null,

              phone:
                pii?.phone ?? null,

              is_active:
                row.is_active,

              created_at:
                row.created_at,

              updated_at:
                row.updated_at,

              owner_apartments:
                row.owner_apartments,

              resident_apartments:
                row.resident_apartments,
            };
          }
        )
        .sort(
          (a, b) => {
            const aKey =
              [
                a.first_name,
                a.last_name,
                a.email,
              ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase();

            const bKey =
              [
                b.first_name,
                b.last_name,
                b.email,
              ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase();

            const byName =
              aKey.localeCompare(
                bKey,
                undefined,
                {
                  sensitivity:
                    "base",
                }
              );

            if (byName !== 0) {
              return byName;
            }

            return Number(a.id) -
              Number(b.id);
          }
        );

    try {
      await PiiAudit.record(
        {
          actorUserId:
            admin.user_id,
          subjectUserId:
            null,
          action:
            "search",
          endpoint:
            "/api/admin/search-users",
          fields: [
            "first_name",
            "last_name",
            "email",
            "phone",
          ],
          subjectCount:
            response.length,
        },
        ctx.env
      );
    } catch (error) {
      console.error(
        "PII audit write failed for /api/admin/search-users",
        {
          actor_user_id:
            admin.user_id,
          subject_count:
            response.length,
          error:
            String(
              error?.message ||
              error
            ),
        }
      );

      return {
        error:
          "pii_audit_failed",
      };
    }

    return response;
  }
);

// =========================
// Stage 2I-5B5:
// Initial PII HMAC search-index backfill endpoint removed after
// all existing PII users were indexed. New and updated users are
// indexed automatically by PiiStore.upsertUserPii().
// =========================

// ADMIN ROLES
Router.register("GET", "/api/admin/roles", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return { error: "forbidden" };

  const r = await ctx.env.DB.prepare(
    "SELECT id,name FROM roles"
  ).all();

  return r.results;
});

// SET ROLES
Router.register("POST", "/api/admin/set-roles", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const userId =
    normalizePositiveInteger(
      body.user_id
    );

  if (!userId) {
    return {
      error: "invalid_user_id"
    };
  }

  if (!Array.isArray(body.roles)) {
    return {
      error: "invalid_roles"
    };
  }

  const roleIds =
    Array.from(
      new Set(
        body.roles.map(
          (value) =>
            normalizePositiveInteger(
              value
            )
        )
      )
    );

  if (
    roleIds.some(
      (value) => !value
    ) ||
    roleIds.length > 32
  ) {
    return {
      error: "invalid_roles"
    };
  }

  const user =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
      .bind(userId)
      .first();

  if (!user) {
    return {
      error: "user_not_found"
    };
  }

  let validRoleIds =
    new Set();

  if (roleIds.length > 0) {
    const placeholders =
      roleIds
        .map(() => "?")
        .join(", ");

    const rolesResult =
      await ctx.env.DB.prepare(`
        SELECT id
        FROM roles
        WHERE id IN (
          ${placeholders}
        )
      `)
        .bind(...roleIds)
        .all();

    validRoleIds =
      new Set(
        (rolesResult.results || [])
          .map(
            (row) =>
              Number(row.id)
          )
      );

    if (
      validRoleIds.size !==
      roleIds.length
    ) {
      return {
        error: "invalid_role_id"
      };
    }
  }

  const adminRole =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM roles
      WHERE name = 'admin'
      LIMIT 1
    `)
      .first();

  const adminRoleId =
    normalizePositiveInteger(
      adminRole?.id
    );

  if (
    userId ===
      Number(admin.user_id) &&
    adminRoleId &&
    !validRoleIds.has(
      adminRoleId
    )
  ) {
    return {
      error:
        "cannot_remove_own_admin_role"
    };
  }

  const statements = [
    ctx.env.DB.prepare(`
      DELETE FROM user_roles
      WHERE user_id = ?
    `)
      .bind(userId),

    ...roleIds.map(
      (roleId) =>
        ctx.env.DB.prepare(`
          INSERT INTO user_roles (
            user_id,
            role_id
          )
          VALUES (?, ?)
        `)
          .bind(
            userId,
            roleId
          )
    ),
  ];

  await ctx.env.DB.batch(
    statements
  );

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_roles_set",
      targetType:
        "user",
      targetId:
        String(userId),
      details: {
        role_ids:
          roleIds,
      },
    }
  );

  return {
    ok: true
  };
});

// =========================
// PASSWORD HASHING
// Stage 2I-SR3:
// New passwords use PBKDF2-HMAC-SHA256 with a unique random salt.
// Legacy 64-character SHA-256 hashes are accepted only for
// verification and are upgraded after the next successful login.
// =========================

const PASSWORD_HASH_SCHEME =
  "pbkdf2-sha256";

const PASSWORD_PBKDF2_ITERATIONS =
  100000;

const PASSWORD_SALT_BYTES =
  16;

const PASSWORD_DERIVED_KEY_BYTES =
  32;

function passwordBytesToBase64Url(
  bytes
) {
  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary +=
      String.fromCharCode(
        bytes[index]
      );
  }

  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function passwordBase64UrlToBytes(
  value
) {
  const source =
    String(value || "");

  if (
    !/^[A-Za-z0-9_-]+$/.test(
      source
    )
  ) {
    throw new Error(
      "invalid_password_hash_encoding"
    );
  }

  let normalized =
    source
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    normalized.length % 4
  ) {
    normalized += "=";
  }

  const binary =
    atob(normalized);

  return Uint8Array.from(
    binary,
    (character) =>
      character.charCodeAt(0)
  );
}

function passwordConstantTimeEqual(
  left,
  right
) {
  const a =
    left instanceof Uint8Array
      ? left
      : new Uint8Array(left);

  const b =
    right instanceof Uint8Array
      ? right
      : new Uint8Array(right);

  if (
    a.length !== b.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < a.length;
    index += 1
  ) {
    difference |=
      a[index] ^ b[index];
  }

  return difference === 0;
}

async function derivePasswordPbkdf2(
  password,
  salt,
  iterations
) {
  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        String(password)
      ),
      {
        name: "PBKDF2",
      },
      false,
      [
        "deriveBits",
      ]
    );

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations,
      },
      keyMaterial,
      PASSWORD_DERIVED_KEY_BYTES *
        8
    );

  return new Uint8Array(
    derivedBits
  );
}

async function hashPassword(
  password
) {
  const normalizedPassword =
    String(password || "");

  if (!normalizedPassword) {
    throw new Error(
      "missing_password"
    );
  }

  const salt =
    crypto.getRandomValues(
      new Uint8Array(
        PASSWORD_SALT_BYTES
      )
    );

  const derivedKey =
    await derivePasswordPbkdf2(
      normalizedPassword,
      salt,
      PASSWORD_PBKDF2_ITERATIONS
    );

  return [
    PASSWORD_HASH_SCHEME,
    String(
      PASSWORD_PBKDF2_ITERATIONS
    ),
    passwordBytesToBase64Url(
      salt
    ),
    passwordBytesToBase64Url(
      derivedKey
    ),
  ].join("$");
}

async function legacySha256Password(
  password
) {
  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        String(password || "")
      )
    );

  return new Uint8Array(
    hashBuffer
  );
}

function hexToBytes(
  value
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized
    )
  ) {
    return null;
  }

  const bytes =
    new Uint8Array(
      normalized.length / 2
    );

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    bytes[index] =
      Number.parseInt(
        normalized.slice(
          index * 2,
          index * 2 + 2
        ),
        16
      );
  }

  return bytes;
}

async function verifyPassword(
  password,
  storedHash
) {
  const normalizedHash =
    String(storedHash || "")
      .trim();

  if (!normalizedHash) {
    return {
      ok: false,
      needs_rehash: false,
      scheme: null,
    };
  }

  // Transitional legacy format:
  // raw SHA-256 hex, 64 characters.
  if (
    /^[0-9a-fA-F]{64}$/.test(
      normalizedHash
    )
  ) {
    const expected =
      hexToBytes(
        normalizedHash
      );

    const actual =
      await legacySha256Password(
        password
      );

    return {
      ok:
        expected !== null &&
        passwordConstantTimeEqual(
          actual,
          expected
        ),
      needs_rehash: true,
      scheme: "legacy-sha256",
    };
  }

  const parts =
    normalizedHash.split("$");

  if (
    parts.length !== 4 ||
    parts[0] !==
      PASSWORD_HASH_SCHEME
  ) {
    return {
      ok: false,
      needs_rehash: false,
      scheme: "unknown",
    };
  }

  const iterations =
    Number(parts[1]);

  if (
    !Number.isInteger(
      iterations
    ) ||
    iterations < 100000 ||
    iterations > 1000000
  ) {
    return {
      ok: false,
      needs_rehash: false,
      scheme:
        PASSWORD_HASH_SCHEME,
    };
  }

  let salt;
  let expected;

  try {
    salt =
      passwordBase64UrlToBytes(
        parts[2]
      );

    expected =
      passwordBase64UrlToBytes(
        parts[3]
      );
  } catch {
    return {
      ok: false,
      needs_rehash: false,
      scheme:
        PASSWORD_HASH_SCHEME,
    };
  }

  if (
    salt.length <
      PASSWORD_SALT_BYTES ||
    expected.length !==
      PASSWORD_DERIVED_KEY_BYTES
  ) {
    return {
      ok: false,
      needs_rehash: false,
      scheme:
        PASSWORD_HASH_SCHEME,
    };
  }

  const actual =
    await derivePasswordPbkdf2(
      password,
      salt,
      iterations
    );

  const ok =
    passwordConstantTimeEqual(
      actual,
      expected
    );

  return {
    ok,
    needs_rehash:
      ok &&
      iterations <
        PASSWORD_PBKDF2_ITERATIONS,
    scheme:
      PASSWORD_HASH_SCHEME,
  };
}

const encoder = new TextEncoder();

function base64url(input) {
  let str =
    typeof input === "string"
      ? input
      : String.fromCharCode(...new Uint8Array(input));

  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// GET USER ROLES
Router.register("GET", "/api/admin/user-roles", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return { error: "forbidden" };

  const userId = ctx.url.searchParams.get("user_id");

  if (!userId) return { error: "missing_user_id" };

  const r = await ctx.env.DB.prepare(`
    SELECT role_id FROM user_roles WHERE user_id = ?
  `).bind(userId).all();

  return {
    roles: r.results.map(x => x.role_id)
  };
});

// GET APARTMENTS
Router.register("GET", "/api/admin/apartments", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return { error: "forbidden" };

  const r = await ctx.env.DB.prepare(`
    SELECT
      id,
      number,
      section,
      floor,
      living_area,
      non_living_area,
      heated_area,
      level_count,
      notes
    FROM apartments
    ORDER BY number
  `).all();

  return r.results;
});

// GET APARTMENT DETAILS
// Stage 2I-5B1:
// Apartment details remain non-PII.
// Main D1 returns only pseudonymous user identity (Nick + relation).
// Personal data is loaded only after explicit navigation to one user.
Router.register("GET", "/api/admin/apartment-details", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return { error: "forbidden" };

  const id = ctx.url.searchParams.get("id");
  if (!id) return { error: "missing_id" };

  const apartment = await ctx.env.DB.prepare(`
    SELECT *
    FROM apartments
    WHERE id = ?
  `).bind(id).first();

  if (!apartment) {
    return {
      error: "apartment_not_found"
    };
  }

  const users = await ctx.env.DB.prepare(`
    SELECT
      ua.user_id AS id,
      u.nick,
      ua.relation_type

    FROM user_apartments ua

    JOIN users u
      ON u.id = ua.user_id

    WHERE ua.apartment_id = ?

    ORDER BY
      ua.relation_type,
      u.nick COLLATE NOCASE,
      u.id
  `).bind(id).all();

  const rows =
    users.results || [];

  return {
    apartment,

    owners:
      rows.filter(
        (user) =>
          user.relation_type ===
          "owner"
      ),

    residents:
      rows.filter(
        (user) =>
          user.relation_type ===
          "resident"
      ),
  };
});

// =========================
// RESIDENT WATER REPORTING PERIOD
// =========================
Router.register(
  "GET",
  "/api/water-reporting-period",
  async (ctx) => {

    const user =
      await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized"
      };
    }

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const nowIso =
      new Date().toISOString();

    const openPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at

        FROM water_reporting_periods

        WHERE status = 'open'
          AND datetime(?) >=
            datetime(collection_opens_at)
          AND datetime(?) <=
            datetime(collection_closes_at)

        ORDER BY
          period_year DESC,
          period_month DESC

        LIMIT 1
      `)
        .bind(
          nowIso,
          nowIso
        )
        .first();

    if (openPeriod) {
      return {
        ok: true,
        submission_allowed: true,
        state: "open",
        period: openPeriod,
      };
    }

    const nextPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at

        FROM water_reporting_periods

        WHERE status = 'scheduled'
          AND datetime(collection_opens_at) >
            datetime(?)

        ORDER BY
          datetime(collection_opens_at) ASC,
          period_year ASC,
          period_month ASC

        LIMIT 1
      `)
        .bind(
          nowIso
        )
        .first();

    if (nextPeriod) {
      return {
        ok: true,
        submission_allowed: false,
        state: "scheduled",
        period: nextPeriod,
      };
    }

    const latestPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at

        FROM water_reporting_periods

        WHERE status IN (
          'closed',
          'finalized'
        )

        ORDER BY
          datetime(collection_closes_at) DESC,
          period_year DESC,
          period_month DESC

        LIMIT 1
      `)
        .first();

    return {
      ok: true,
      submission_allowed: false,
      state:
        latestPeriod
          ? latestPeriod.status
          : "unavailable",
      period:
        latestPeriod || null,
    };
  }
);

// =========================
// MY WATER METERS
// =========================
Router.register("GET", "/api/my-water-meters", async (ctx) => {

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

  const result = await ctx.env.DB.prepare(`
    SELECT
      wm.id,
      wm.type,
      wm.serial_number,
      wm.apartment_riser_id,

      a.number AS apartment_number,

      r.code AS riser_code,
      r.system_type AS riser_system_type,

      ar.local_label AS local_label,

      (
        SELECT wmr.reading_value
        FROM water_meter_readings wmr
        WHERE wmr.meter_id = wm.id
          AND wmr.status = 'active'
        ORDER BY
          wmr.reading_date DESC,
          wmr.id DESC
        LIMIT 1
      ) AS last_reading,

      (
        SELECT wmr.reading_date
        FROM water_meter_readings wmr
        WHERE wmr.meter_id = wm.id
          AND wmr.status = 'active'
        ORDER BY
          wmr.reading_date DESC,
          wmr.id DESC
        LIMIT 1
      ) AS last_date

    FROM water_meters wm

    JOIN apartments a
      ON a.id = wm.apartment_id

    LEFT JOIN apartment_risers ar
      ON ar.id = wm.apartment_riser_id

    LEFT JOIN risers r
      ON r.id = ar.riser_id

    WHERE EXISTS (
      SELECT 1
      FROM user_apartments ua
      WHERE ua.apartment_id = a.id
        AND ua.user_id = ?
    )

    ORDER BY a.number, wm.type
  `)
    .bind(u.user_id)
    .all();

  return result.results;
});

// =========================
// MY WATER METER HISTORY
// =========================
Router.register("GET", "/api/my-water-meter-history", async (ctx) => {

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

  const meterId =
    Number(
      ctx.url.searchParams.get("id")
    );

  if (
    !Number.isInteger(meterId) ||
    meterId <= 0
  ) {
    return {
      error: "invalid_meter_id"
    };
  }

  const meter = await ctx.env.DB.prepare(`
    SELECT
      wm.id,
      wm.type,
      wm.serial_number,
      a.number AS apartment_number,
      r.code AS riser_code,
      ar.local_label

    FROM water_meters wm

    JOIN apartments a
      ON a.id = wm.apartment_id

    LEFT JOIN apartment_risers ar
      ON ar.id = wm.apartment_riser_id

    LEFT JOIN risers r
      ON r.id = ar.riser_id

    WHERE wm.id = ?

      AND EXISTS (
        SELECT 1
        FROM user_apartments ua
        WHERE ua.apartment_id = wm.apartment_id
          AND ua.user_id = ?
      )
  `)
    .bind(
      meterId,
      u.user_id
    )
    .first();

  if (!meter) {
    return {
      error: "meter_not_allowed"
    };
  }

  const result = await ctx.env.DB.prepare(`
    SELECT
      id,
      reading_value,
      reading_date,
      submitted_by

    FROM water_meter_readings

    WHERE meter_id = ?
      AND status = 'active'

    ORDER BY
      reading_date DESC,
      id DESC
  `)
    .bind(meterId)
    .all();

  return {
    meter,
    readings:
      result.results || []
  };
});

// =========================
// SUBMIT WATER READING
// =========================
Router.register("POST", "/api/submit-water-reading", async (ctx) => {

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

  await syncWaterReportingPeriodStatuses(
    ctx.env
  );

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const meterId =
    Number(body.meter_id);

  const readingValue =
    Number(body.reading_value);

  if (
    !Number.isInteger(meterId) ||
    meterId <= 0 ||
    !Number.isInteger(
      readingValue
    ) ||
    readingValue < 0
  ) {
    return {
      error: "invalid_fields"
    };
  }

  const meter =
    await ctx.env.DB.prepare(`
      SELECT wm.*

      FROM water_meters wm

      WHERE wm.id = ?
        AND wm.active = 1

        AND EXISTS (
          SELECT 1
          FROM user_apartments ua
          WHERE ua.apartment_id =
            wm.apartment_id
            AND ua.user_id = ?
        )
    `)
      .bind(
        meterId,
        u.user_id
      )
      .first();

  if (!meter) {
    return {
      error: "meter_not_allowed"
    };
  }

  const nowIso =
    new Date().toISOString();

  const reportingPeriod =
    await ctx.env.DB.prepare(`
      SELECT
        id,
        period_year,
        period_month,
        status,
        collection_opens_at,
        collection_closes_at

      FROM water_reporting_periods

      WHERE status = 'open'
        AND datetime(?) >=
          datetime(collection_opens_at)
        AND datetime(?) <=
          datetime(collection_closes_at)

      ORDER BY
        period_year DESC,
        period_month DESC

      LIMIT 1
    `)
      .bind(
        nowIso,
        nowIso
      )
      .first();

  if (!reportingPeriod) {
    return {
      error:
        "water_collection_period_closed"
    };
  }

  const existingReading =
    await ctx.env.DB.prepare(`
      SELECT id

      FROM water_meter_readings

      WHERE meter_id = ?
        AND reporting_period_id = ?
        AND status = 'active'

      ORDER BY id DESC

      LIMIT 1
    `)
      .bind(
        meterId,
        reportingPeriod.id
      )
      .first();

  if (existingReading) {
    return {
      error:
        "reading_already_submitted_for_period"
    };
  }

  const readingDate =
    `${reportingPeriod.period_year}-${String(
      reportingPeriod.period_month
    ).padStart(2, "0")}-01`;

  await ctx.env.DB.prepare(`
    INSERT INTO water_meter_readings (
      meter_id,
      reading_value,
      reading_date,
      submitted_by,
      status,
      reporting_period_id,
      submitted_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      'active',
      ?,
      ?
    )
  `)
    .bind(
      meterId,
      readingValue,
      readingDate,
      u.user_id,
      reportingPeriod.id,
      nowIso
    )
    .run();

  return {
    ok: true,
    reporting_period_id:
      reportingPeriod.id
  };
});

// =========================
// CORRECT WATER READING
// =========================
Router.register("POST", "/api/correct-water-reading", async (ctx) => {

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

  await syncWaterReportingPeriodStatuses(
    ctx.env
  );

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const readingId =
    Number(body.reading_id);

  const newReadingValue =
    Number(body.reading_value);

  const correctionReason =
    String(
      body.reason || ""
    ).trim();

  if (
    !Number.isInteger(readingId) ||
    readingId <= 0
  ) {
    return {
      error: "invalid_reading_id"
    };
  }

  if (
    !Number.isInteger(
      newReadingValue
    ) ||
    newReadingValue < 0
  ) {
    return {
      error: "invalid_reading_value"
    };
  }

  if (!correctionReason) {
    return {
      error:
        "missing_correction_reason"
    };
  }

  const reading =
    await ctx.env.DB.prepare(`
      SELECT
        wmr.id,
        wmr.meter_id,
        wmr.reading_value,
        wmr.reading_date,
        wmr.status,
        wmr.reporting_period_id,
        wm.apartment_id

      FROM water_meter_readings wmr

      JOIN water_meters wm
        ON wm.id = wmr.meter_id

      WHERE wmr.id = ?

        AND EXISTS (
          SELECT 1
          FROM user_apartments ua
          WHERE ua.apartment_id =
            wm.apartment_id
            AND ua.user_id = ?
        )
    `)
      .bind(
        readingId,
        u.user_id
      )
      .first();

  if (!reading) {
    return {
      error: "reading_not_allowed"
    };
  }

  if (reading.status !== "active") {
    return {
      error: "reading_not_active"
    };
  }

  if (!reading.reporting_period_id) {
    return {
      error:
        "reading_period_not_assigned"
    };
  }

  const nowIso =
    new Date().toISOString();

  const reportingPeriod =
    await ctx.env.DB.prepare(`
      SELECT
        id,
        status,
        collection_opens_at,
        collection_closes_at

      FROM water_reporting_periods

      WHERE id = ?
    `)
      .bind(
        reading.reporting_period_id
      )
      .first();

  const correctionAllowed =
    reportingPeriod &&
    reportingPeriod.status === "open" &&
    new Date(nowIso) >=
      new Date(
        reportingPeriod.collection_opens_at
      ) &&
    new Date(nowIso) <=
      new Date(
        reportingPeriod.collection_closes_at
      );

  if (!correctionAllowed) {
    return {
      error:
        "water_collection_period_closed"
    };
  }

  const latestActiveReading =
    await ctx.env.DB.prepare(`
      SELECT id

      FROM water_meter_readings

      WHERE meter_id = ?
        AND reporting_period_id = ?
        AND status = 'active'

      ORDER BY id DESC

      LIMIT 1
    `)
      .bind(
        reading.meter_id,
        reading.reporting_period_id
      )
      .first();

  if (
    !latestActiveReading ||
    Number(
      latestActiveReading.id
    ) !== readingId
  ) {
    return {
      error:
        "only_latest_reading_can_be_corrected"
    };
  }

  if (
    Number(
      reading.reading_value
    ) === newReadingValue
  ) {
    return {
      error: "reading_value_unchanged"
    };
  }

  const insertResult =
    await ctx.env.DB.prepare(`
      INSERT INTO water_meter_readings (
        meter_id,
        reading_value,
        reading_date,
        submitted_by,
        status,
        reporting_period_id,
        submitted_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'active',
        ?,
        ?
      )
    `)
      .bind(
        reading.meter_id,
        newReadingValue,
        reading.reading_date,
        u.user_id,
        reading.reporting_period_id,
        nowIso
      )
      .run();

  const newReadingId =
    insertResult.meta.last_row_id;

  await ctx.env.DB.prepare(`
    UPDATE water_meter_readings

    SET
      status = 'superseded',
      superseded_by_reading_id = ?,
      correction_reason = ?,
      corrected_by = ?,
      corrected_at = CURRENT_TIMESTAMP

    WHERE id = ?
      AND status = 'active'
  `)
    .bind(
      newReadingId,
      correctionReason,
      u.user_id,
      readingId
    )
    .run();

  return {
    ok: true,
    old_reading_id:
      readingId,
    new_reading_id:
      newReadingId,
    reporting_period_id:
      reading.reporting_period_id
  };
});

// =========================
// ADMIN BACKUP MANAGEMENT
// Stage 2I-SR14B:
// Read-only backup status and run history.
// The application does not expose backup credentials or secrets.
// =========================

Router.register(
  "GET",
  "/api/admin/backup/status",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const [
      settings,
      lastRun,
      lastSuccessfulRun,
    ] =
      await Promise.all([
        getBackupSettings(
          ctx.env
        ),
        getLatestBackupRun(
          ctx.env
        ),
        getLatestBackupRun(
          ctx.env,
          {
            successfulOnly:
              true,
          }
        ),
      ]);

    return {
      ok: true,

      settings,

      last_run:
        lastRun,

      last_successful_run:
        lastSuccessfulRun,

      protection: {
        main_d1_time_travel: {
          enabled: true,
          database:
            "housing-db",
        },

        pii_d1_time_travel: {
          enabled: true,
          database:
            "housing-pii-db",
        },

        r2_bucket_lock: {
          enabled: true,
          bucket:
            "mvx-water-meter-certificates",
          retention_days: 90,
        },

        offsite_backup: {
          enabled: true,
          provider:
            "MEGA",
          destination:
            "/MVX-Backups",
          schedule:
            "weekly",
          schedule_utc:
            "Sunday 03:30",
        },
      },
    };
  }
);

Router.register(
  "GET",
  "/api/admin/backup/runs",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const rawLimit =
      ctx.url.searchParams.get(
        "limit"
      );

    const limit =
      rawLimit === null
        ? BACKUP_RUNS_DEFAULT_LIMIT
        : normalizeIntegerInRange(
            rawLimit,
            {
              min: 1,
              max:
                BACKUP_RUNS_MAX_LIMIT,
              fallback: null,
            }
          );

    if (limit === null) {
      return {
        error:
          "invalid_backup_runs_limit"
      };
    }

    return {
      ok: true,
      limit,
      runs:
        await getBackupRuns(
          ctx.env,
          limit
        ),
    };
  }
);


Router.register(
  "POST",
  "/api/admin/backup/settings",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    if (
      typeof body
        .automatic_enabled !==
      "boolean"
    ) {
      return {
        error:
          "invalid_automatic_enabled"
      };
    }

    await ensureBackupStatusTables(
      ctx.env
    );

    const automaticEnabled =
      body.automatic_enabled
        ? 1
        : 0;

    const nowIso =
      new Date()
        .toISOString();

    await ctx.env.DB.prepare(`
      UPDATE backup_settings
      SET
        automatic_enabled = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        automaticEnabled,
        admin.user_id,
        nowIso,
        BACKUP_SETTINGS_ID
      )
      .run();

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.backup_settings_update",
        targetType:
          "backup_settings",
        targetId:
          String(
            BACKUP_SETTINGS_ID
          ),
        details: {
          automatic_enabled:
            Boolean(
              body
                .automatic_enabled
            ),
        },
      }
    );

    return {
      ok: true,
      settings:
        await getBackupSettings(
          ctx.env
        ),
    };
  }
);


Router.register(
  "POST",
  "/api/admin/backup/create",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await ensureBackupStatusTables(
      ctx.env
    );

    const github =
      getGitHubBackupConfiguration(
        ctx.env
      );

    if (!github.ok) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.backup_create",
          targetType:
            "backup_run",
          result:
            "failure",
          details: {
            failure_type:
              "github_not_configured",
          },
        }
      );

      return {
        error:
          github.error
      };
    }

    // Protect against double-clicks or two administrators starting
    // overlapping manual backups. A stale run older than 2 hours
    // does not block a new request.
    const activeRun =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          status,
          created_at
        FROM backup_runs
        WHERE status IN (
          'requested',
          'running'
        )
          AND datetime(created_at) >=
            datetime(
              'now',
              '-2 hours'
            )
        ORDER BY
          datetime(created_at) DESC,
          id DESC
        LIMIT 1
      `)
        .first();

    if (activeRun) {
      return {
        error:
          "backup_already_in_progress",
        backup_run_id:
          Number(activeRun.id),
        status:
          activeRun.status,
      };
    }

    const nowIso =
      new Date()
        .toISOString();

    const insertResult =
      await ctx.env.DB.prepare(`
        INSERT INTO backup_runs (
          trigger_type,
          status,
          requested_by,
          created_at,
          updated_at
        )
        VALUES (
          'manual',
          'requested',
          ?,
          ?,
          ?
        )
      `)
        .bind(
          admin.user_id,
          nowIso,
          nowIso
        )
        .run();

    const backupRunId =
      Number(
        insertResult?.meta
          ?.last_row_id
      );

    if (
      !Number.isInteger(
        backupRunId
      ) ||
      backupRunId <= 0
    ) {
      throw new Error(
        "backup_run_insert_failed"
      );
    }

    const dispatchUrl =
      `https://api.github.com/repos/${encodeURIComponent(
        github.owner
      )}/${encodeURIComponent(
        github.repo
      )}/actions/workflows/${encodeURIComponent(
        github.workflow
      )}/dispatches`;

    let dispatchResponse;

    try {
      dispatchResponse =
        await fetch(
          dispatchUrl,
          {
            method: "POST",
            headers: {
              "Accept":
                "application/vnd.github+json",
              "Authorization":
                `Bearer ${github.token}`,
              "Content-Type":
                "application/json",
              "X-GitHub-Api-Version":
                "2022-11-28",
              "User-Agent":
                "MVX-Housing-System",
            },
            body:
              JSON.stringify({
                ref: "main",
                inputs: {
                  backup_run_id:
                    String(
                      backupRunId
                    ),
                  trigger_type:
                    "manual",
                },
              }),
          }
        );
    } catch (error) {
      await ctx.env.DB.prepare(`
        UPDATE backup_runs
        SET
          status = 'failed',
          completed_at = ?,
          failure_code =
            'GITHUB_DISPATCH_ERROR',
          updated_at = ?
        WHERE id = ?
          AND status = 'requested'
      `)
        .bind(
          nowIso,
          nowIso,
          backupRunId
        )
        .run();

      App.logError(
        "backup_dispatch_error",
        error,
        {
          backup_run_id:
            backupRunId,
        }
      );

      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.backup_create",
          targetType:
            "backup_run",
          targetId:
            String(
              backupRunId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "dispatch_error",
          },
        }
      );

      return {
        error:
          "backup_dispatch_failed",
        backup_run:
          await getBackupRunById(
            ctx.env,
            backupRunId
          ),
      };
    }

    if (!dispatchResponse.ok) {
      const completedAt =
        new Date()
          .toISOString();

      await ctx.env.DB.prepare(`
        UPDATE backup_runs
        SET
          status = 'failed',
          completed_at = ?,
          failure_code =
            'GITHUB_DISPATCH_FAILED',
          updated_at = ?
        WHERE id = ?
          AND status = 'requested'
      `)
        .bind(
          completedAt,
          completedAt,
          backupRunId
        )
        .run();

      App.logError(
        "backup_dispatch_rejected",
        new Error(
          "github_dispatch_rejected"
        ),
        {
          backup_run_id:
            backupRunId,
          github_status:
            Number(
              dispatchResponse.status
            ),
        }
      );

      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.backup_create",
          targetType:
            "backup_run",
          targetId:
            String(
              backupRunId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "dispatch_rejected",
            github_status:
              Number(
                dispatchResponse.status
              ),
          },
        }
      );

      return {
        error:
          "backup_dispatch_failed",
        backup_run:
          await getBackupRunById(
            ctx.env,
            backupRunId
          ),
      };
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.backup_create",
        targetType:
          "backup_run",
        targetId:
          String(
            backupRunId
          ),
        details: {
          trigger_type:
            "manual",
          dispatch_accepted:
            true,
        },
      }
    );

    return {
      ok: true,
      dispatch_accepted:
        true,
      backup_run:
        await getBackupRunById(
          ctx.env,
          backupRunId
        ),
    };
  }
);



// =========================
// ADMIN RESTORE MANAGEMENT
// Stage 2I-SR14F-A / SR14F-B / SR14F-C / SR14F-D4 / SR14F-D5A / SR14F-D5B-1:
// - read-only restore status and restore-point catalogue;
// - protected creation/cancellation of a short-lived restore request;
// - non-destructive preview / validation with D1 safety checkpoints;
// - final readiness gate;
// - short-lived one-time execution arming;
// - non-destructive execution-token verification dry-run.
//
// IMPORTANT:
// SR14F-D5B-1 still does NOT execute any restore.
// No route below restores D1, imports MEGA data, overwrites R2,
// or changes backup contents.
// =========================
Router.register(
  "GET",
  "/api/admin/restore/status",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const rawLimit =
      ctx.url.searchParams.get(
        "limit"
      );

    const limit =
      rawLimit === null
        ? RESTORE_POINTS_DEFAULT_LIMIT
        : normalizeIntegerInRange(
            rawLimit,
            {
              min: 1,
              max:
                RESTORE_POINTS_MAX_LIMIT,
              fallback: null,
            }
          );

    if (limit === null) {
      return {
        error:
          "invalid_restore_points_limit"
      };
    }

    const cloudflare =
      getCloudflareD1ReadConfiguration(
        ctx.env
      );

    let mainTimeTravel;
    let piiTimeTravel;

    if (cloudflare.configured) {
      [
        mainTimeTravel,
        piiTimeTravel,
      ] =
        await Promise.all([
          getD1TimeTravelBookmark({
            accountId:
              cloudflare.account_id,
            databaseId:
              cloudflare.main_database_id,
            apiToken:
              cloudflare.api_token,
            databaseName:
              "housing-db",
          }),

          getD1TimeTravelBookmark({
            accountId:
              cloudflare.account_id,
            databaseId:
              cloudflare.pii_database_id,
            apiToken:
              cloudflare.api_token,
            databaseName:
              "housing-pii-db",
          }),
        ]);
    } else {
      const checkedAt =
        new Date()
          .toISOString();

      mainTimeTravel = {
        database:
          "housing-db",
        database_id:
          cloudflare
            .main_database_id,
        available: false,
        bookmark: null,
        checked_at:
          checkedAt,
        error:
          "time_travel_status_not_configured",
      };

      piiTimeTravel = {
        database:
          "housing-pii-db",
        database_id:
          cloudflare
            .pii_database_id,
        available: false,
        bookmark: null,
        checked_at:
          checkedAt,
        error:
          "time_travel_status_not_configured",
      };
    }

    const restorePoints =
      await getOffsiteRestorePoints(
        ctx.env,
        limit
      );

    const activeRequest =
      await getActiveRestoreRequest(
        ctx.env,
        admin.user_id
      );

    const latestValidation =
      activeRequest
        ? await getLatestRestoreValidation(
            ctx.env,
            activeRequest.id,
            admin.user_id
          )
        : null;

    const latestReadiness =
      activeRequest
        ? await getLatestRestoreReadiness(
            ctx.env,
            activeRequest.id,
            admin.user_id
          )
        : null;

    const activeExecutionArm =
      await getActiveRestoreExecutionArm(
        ctx.env,
        admin.user_id
      );

    return {
      ok: true,

      mode:
        "read_only",

      destructive_operations_exposed:
        false,

      request_policy: {
        request_creation_enabled:
          true,
        request_cancellation_enabled:
          true,
        preview_validation_enabled:
          true,
        final_readiness_enabled:
          true,
        execution_arm_enabled:
          true,
        execution_dry_run_enabled:
          true,
        execution_dispatch_enabled:
          true,
        destructive_restore_enabled:
          false,
        restore_execution_enabled:
          false,
        ttl_minutes:
          RESTORE_REQUEST_TTL_MINUTES,
        execution_arm_ttl_minutes:
          RESTORE_EXECUTION_ARM_TTL_MINUTES,
        readiness_max_age_minutes:
          RESTORE_READINESS_MAX_AGE_MINUTES,
        supported_restore_types:
          Array.from(
            RESTORE_REQUEST_SUPPORTED_TYPES
          ),
        confirmation_phrase_template:
          `${RESTORE_REQUEST_CONFIRMATION_PREFIX} {backup_run_id}`,
      },

      active_request:
        activeRequest,

      latest_validation:
        latestValidation,

      latest_readiness:
        latestReadiness,

      active_execution_arm:
        activeExecutionArm,

      time_travel: {
        configured:
          cloudflare.configured,

        window_days:
          getConfiguredTimeTravelWindowDays(
            ctx.env
          ),

        main:
          mainTimeTravel,

        pii:
          piiTimeTravel,
      },

      offsite: {
        provider:
          "MEGA",

        destination:
          "/MVX-Backups",

        restore_points:
          restorePoints,

        restore_point_count:
          restorePoints.length,

        limit,
      },
    };
  }
);



// =========================
// ADMIN CREATE PROTECTED RESTORE REQUEST
// Stage 2I-SR14F-B
//
// This route ONLY creates a 15-minute intent record.
// It does not execute a restore.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/request",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const requestLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-request",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_REQUEST_LIMIT,
      });

    if (!requestLimit.allowed) {
      return SecurityRateLimit.response(
        requestLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreType =
      String(
        body.restore_type || ""
      )
        .trim()
        .toLowerCase();

    const backupRunId =
      normalizePositiveInteger(
        body.backup_run_id
      );

    const currentPassword =
      String(
        body.current_password || ""
      );

    const confirmationPhrase =
      String(
        body.confirmation_phrase || ""
      ).trim();

    if (
      !RESTORE_REQUEST_SUPPORTED_TYPES
        .has(restoreType)
    ) {
      return {
        error:
          "restore_type_not_enabled"
      };
    }

    if (!backupRunId) {
      return {
        error:
          "invalid_backup_run_id"
      };
    }

    if (
      !currentPassword ||
      currentPassword.length > 1024
    ) {
      return {
        error:
          "current_password_required"
      };
    }

    const expectedConfirmationPhrase =
      getRestoreRequestConfirmationPhrase(
        backupRunId
      );

    if (
      confirmationPhrase !==
      expectedConfirmationPhrase
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_request_create",
          targetType:
            "backup_run",
          targetId:
            String(
              backupRunId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "confirmation_phrase_mismatch",
            restore_type:
              restoreType,
          },
        }
      );

      return {
        error:
          "restore_confirmation_phrase_incorrect",
        required_confirmation_phrase:
          expectedConfirmationPhrase,
      };
    }

    const passwordLimitKey =
      `user:${admin.user_id}`;

    const passwordLimitCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "admin-restore-password-failure",
        key:
          passwordLimitKey,
        windowSeconds:
          ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT
            .windowSeconds,
      });

    if (!passwordLimitCheck.allowed) {
      return SecurityRateLimit.response(
        passwordLimitCheck
      );
    }

    const user =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          password_hash,
          is_active
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
        .bind(
          admin.user_id
        )
        .first();

    if (
      !user ||
      Number(user.is_active) !== 1
    ) {
      return {
        error:
          "user_not_found_or_inactive"
      };
    }

    const passwordCheck =
      await verifyPassword(
        currentPassword,
        user.password_hash || ""
      );

    if (!passwordCheck.ok) {
      const failureResult =
        await SecurityRateLimit.recordFailure({
          env: ctx.env,
          scope:
            "admin-restore-password-failure",
          key:
            passwordLimitKey,
          ...ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT,
        });

      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_request_create",
          targetType:
            "backup_run",
          targetId:
            String(
              backupRunId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "password_incorrect",
            restore_type:
              restoreType,
          },
        }
      );

      if (!failureResult.allowed) {
        return SecurityRateLimit.response(
          failureResult
        );
      }

      return {
        error:
          "current_password_incorrect"
      };
    }

    await SecurityRateLimit.clear({
      env: ctx.env,
      scope:
        "admin-restore-password-failure",
      key:
        passwordLimitKey,
    });

    const restorePoint =
      await getVerifiedOffsiteRestorePoint(
        ctx.env,
        backupRunId
      );

    if (!restorePoint.ok) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_request_create",
          targetType:
            "backup_run",
          targetId:
            String(
              backupRunId
            ),
          result:
            "failure",
          details: {
            failure_type:
              restorePoint.error,
            restore_type:
              restoreType,
          },
        }
      );

      return {
        error:
          restorePoint.error
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    const activeRequest =
      await getActiveRestoreRequest(
        ctx.env,
        admin.user_id
      );

    if (activeRequest) {
      return {
        error:
          "restore_request_already_active",
        active_request:
          activeRequest,
      };
    }

    const now =
      new Date();

    const confirmedAt =
      now.toISOString();

    const expiresAt =
      new Date(
        now.getTime() +
        RESTORE_REQUEST_TTL_MINUTES *
          60 *
          1000
      ).toISOString();

    let insertResult;

    try {
      insertResult =
        await ctx.env.DB.prepare(`
          INSERT INTO restore_requests (
            restore_type,
            status,
            requested_by,
            backup_run_id,
            target_timestamp,
            target_bookmark,
            archive_name,
            archive_sha256,
            confirmed_at,
            expires_at,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            'pending',
            ?,
            ?,
            NULL,
            NULL,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `)
          .bind(
            restoreType,
            admin.user_id,
            backupRunId,
            restorePoint.point
              .archive_name,
            restorePoint.point
              .archive_sha256,
            confirmedAt,
            expiresAt,
            confirmedAt,
            confirmedAt
          )
          .run();
    } catch (error) {
      const concurrentRequest =
        await getActiveRestoreRequest(
          ctx.env,
          admin.user_id
        );

      if (concurrentRequest) {
        return {
          error:
            "restore_request_already_active",
          active_request:
            concurrentRequest,
        };
      }

      throw error;
    }

    const restoreRequestId =
      normalizePositiveInteger(
        insertResult?.meta
          ?.last_row_id
      );

    if (!restoreRequestId) {
      throw new Error(
        "restore_request_insert_failed"
      );
    }

    const createdRequest =
      await getActiveRestoreRequest(
        ctx.env,
        admin.user_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_request_create",
        targetType:
          "restore_request",
        targetId:
          String(
            restoreRequestId
          ),
        details: {
          restore_type:
            restoreType,
          backup_run_id:
            backupRunId,
          ttl_minutes:
            RESTORE_REQUEST_TTL_MINUTES,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      request:
        createdRequest,
    };
  }
);

// =========================
// ADMIN RESTORE PREVIEW / VALIDATION
// Stage 2I-SR14F-C
//
// This route performs preflight checks only.
// It does NOT execute a restore.
//
// For the currently enabled offsite_backup flow:
// - the backup_run metadata must still match the protected request;
// - Main and PII D1 Time Travel must both be readable;
// - current D1 bookmarks are captured only as safety checkpoints.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/validate",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const validateLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-validate",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_VALIDATE_LIMIT,
      });

    if (!validateLimit.allowed) {
      return SecurityRateLimit.response(
        validateLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id"
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await ensureRestoreValidationSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    const restoreRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !restoreRequest ||
      restoreRequest.status !==
        "pending"
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_validate",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "request_not_active",
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_request_not_active"
      };
    }

    if (
      restoreRequest.restore_type !==
        "offsite_backup"
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_validate",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "restore_type_not_enabled",
            restore_type:
              restoreRequest
                .restore_type,
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_type_not_enabled"
      };
    }

    const verifiedPoint =
      await getVerifiedOffsiteRestorePoint(
        ctx.env,
        restoreRequest.backup_run_id
      );

    let offsiteReady = false;
    let offsiteError = null;
    let targetTimestamp = null;

    if (verifiedPoint.ok) {
      const point =
        verifiedPoint.point;

      const metadataMatches =
        point.archive_name ===
          String(
            restoreRequest
              .archive_name || ""
          ) &&
        point.archive_sha256 ===
          String(
            restoreRequest
              .archive_sha256 || ""
          );

      if (metadataMatches) {
        offsiteReady = true;
        targetTimestamp =
          point.completed_at ||
          point.created_at ||
          null;
      } else {
        offsiteError =
          "restore_point_metadata_changed";
      }
    } else {
      offsiteError =
        verifiedPoint.error;
    }

    const safetyCheckpoints =
      await getRestoreTimeTravelSafetyCheckpoints(
        ctx.env
      );

    const mainReady =
      safetyCheckpoints
        .main?.available ===
      true;

    const piiReady =
      safetyCheckpoints
        .pii?.available ===
      true;

    const failureCode =
      getRestoreValidationFailureCode({
        offsiteReady,
        mainReady,
        piiReady,
        offsiteError,
        timeTravelConfigured:
          safetyCheckpoints
            .configured,
      });

    const ready =
      !failureCode;

    const validatedAt =
      new Date().toISOString();

    const insertResult =
      await ctx.env.DB.prepare(`
        INSERT INTO restore_validations (
          restore_request_id,
          validation_status,
          main_ready,
          pii_ready,
          offsite_ready,
          target_timestamp,
          main_bookmark,
          pii_bookmark,
          failure_code,
          validated_by,
          validated_at,
          created_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `)
        .bind(
          restoreRequestId,
          ready
            ? "ready"
            : "blocked",
          mainReady ? 1 : 0,
          piiReady ? 1 : 0,
          offsiteReady ? 1 : 0,
          targetTimestamp,
          safetyCheckpoints
            .main?.bookmark ||
            null,
          safetyCheckpoints
            .pii?.bookmark ||
            null,
          failureCode,
          admin.user_id,
          validatedAt,
          validatedAt
        )
        .run();

    const validationId =
      normalizePositiveInteger(
        insertResult?.meta
          ?.last_row_id
      );

    if (!validationId) {
      throw new Error(
        "restore_validation_insert_failed"
      );
    }

    const validation =
      await getLatestRestoreValidation(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_validate",
        targetType:
          "restore_request",
        targetId:
          String(
            restoreRequestId
          ),
        result:
          ready
            ? "success"
            : "blocked",
        details: {
          restore_type:
            restoreRequest
              .restore_type,
          backup_run_id:
            restoreRequest
              .backup_run_id,
          main_ready:
            mainReady,
          pii_ready:
            piiReady,
          offsite_ready:
            offsiteReady,
          validation_status:
            ready
              ? "ready"
              : "blocked",
          failure_type:
            failureCode,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,

      mode:
        "preview_validation",

      ready_for_execution:
        ready,

      restore_execution_started:
        false,

      restore_execution_enabled:
        false,

      request:
        restoreRequest,

      validation,

      preview: {
        restore_type:
          restoreRequest
            .restore_type,

        backup_run_id:
          restoreRequest
            .backup_run_id,

        target_timestamp:
          targetTimestamp,

        archive_name:
          restoreRequest
            .archive_name,

        checks: {
          protected_request_active:
            true,

          offsite_backup_metadata_verified:
            offsiteReady,

          main_d1_time_travel_available:
            mainReady,

          pii_d1_time_travel_available:
            piiReady,
        },

        safety_checkpoints: {
          role:
            "pre_restore_current_state",

          main: {
            available:
              mainReady,
            checked_at:
              safetyCheckpoints
                .main
                ?.checked_at ||
              null,
          },

          pii: {
            available:
              piiReady,
            checked_at:
              safetyCheckpoints
                .pii
                ?.checked_at ||
              null,
          },
        },

        limitations: {
          live_mega_archive_fetch_performed:
            false,

          destructive_restore_performed:
            false,
        },
      },
    };
  }
);



// =========================
// ADMIN FINAL RESTORE READINESS
// Stage 2I-SR14F-D4
//
// Final readiness is a non-destructive gate. It requires a live protected
// request, a READY preview validation, a fully verified SR14F-D3 offsite
// check, and fresh Main/PII Time Travel safety checkpoints.
//
// This endpoint only records readiness. It NEVER executes a restore.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/readiness",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const readinessLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-readiness",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_READINESS_LIMIT,
      });

    if (!readinessLimit.allowed) {
      return SecurityRateLimit.response(
        readinessLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id"
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await ensureRestoreValidationSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    const restoreRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    const requestActive =
      Boolean(
        restoreRequest &&
        restoreRequest.status ===
          "pending"
      );

    if (!requestActive) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_readiness",
          targetType:
            "restore_request",
          targetId:
            String(restoreRequestId),
          result:
            "failure",
          details: {
            failure_type:
              "restore_request_not_active",
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_request_not_active"
      };
    }

    if (
      restoreRequest.restore_type !==
        "offsite_backup"
    ) {
      return {
        error:
          "restore_type_not_enabled"
      };
    }

    const validation =
      await getLatestRestoreValidation(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    const previewReady =
      Boolean(
        validation &&
        validation.validation_status ===
          "ready" &&
        validation.main_ready === true &&
        validation.pii_ready === true &&
        validation.offsite_ready === true
      );

    const offsiteCheck =
      await getLatestCompletedOffsiteCheck(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    const metadataMatches =
      Boolean(
        offsiteCheck &&
        offsiteCheck.archive_name ===
          restoreRequest.archive_name &&
        String(
          offsiteCheck.expected_sha256 || ""
        ) ===
          String(
            restoreRequest.archive_sha256 || ""
          ) &&
        String(
          offsiteCheck.actual_sha256 || ""
        ) ===
          String(
            restoreRequest.archive_sha256 || ""
          )
      );

    const offsitePresent =
      Boolean(
        metadataMatches &&
        offsiteCheck.status === "present"
      );

    const sha256Verified =
      Boolean(
        metadataMatches &&
        Number(
          offsiteCheck.sha256_verified
        ) === 1
      );

    const decryptionVerified =
      Boolean(
        metadataMatches &&
        Number(
          offsiteCheck.decryption_verified
        ) === 1
      );

    const archiveStructureVerified =
      Boolean(
        metadataMatches &&
        Number(
          offsiteCheck.archive_structure_verified
        ) === 1
      );

    const internalChecksumsVerified =
      Boolean(
        metadataMatches &&
        Number(
          offsiteCheck.internal_checksums_verified
        ) === 1
      );

    const mainSqlIntegrity =
      metadataMatches
        ? offsiteCheck?.main_sql_integrity || null
        : null;

    const piiSqlIntegrity =
      metadataMatches
        ? offsiteCheck?.pii_sql_integrity || null
        : null;

    const safetyCheckpoints =
      await getRestoreTimeTravelSafetyCheckpoints(
        ctx.env
      );

    const mainCheckpointReady =
      safetyCheckpoints.main?.available ===
        true &&
      Boolean(
        safetyCheckpoints.main?.bookmark
      );

    const piiCheckpointReady =
      safetyCheckpoints.pii?.available ===
        true &&
      Boolean(
        safetyCheckpoints.pii?.bookmark
      );

    const failureCode =
      getRestoreReadinessFailureCode({
        requestActive,
        previewReady,
        offsitePresent,
        sha256Verified,
        decryptionVerified,
        archiveStructureVerified,
        internalChecksumsVerified,
        mainSqlIntegrity,
        piiSqlIntegrity,
        mainCheckpointReady,
        piiCheckpointReady,
      });

    const ready = !failureCode;
    const checkedAt =
      new Date().toISOString();

    const insertResult =
      await ctx.env.DB.prepare(`
        INSERT INTO restore_readiness (
          restore_request_id,
          validation_id,
          offsite_check_id,
          status,
          request_active,
          preview_ready,
          offsite_present,
          sha256_verified,
          decryption_verified,
          archive_structure_verified,
          internal_checksums_verified,
          main_sql_integrity,
          pii_sql_integrity,
          main_checkpoint_bookmark,
          pii_checkpoint_bookmark,
          failure_code,
          checked_by,
          checked_at,
          created_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
        .bind(
          restoreRequestId,
          validation?.id || null,
          offsiteCheck?.id || null,
          ready ? "ready" : "blocked",
          requestActive ? 1 : 0,
          previewReady ? 1 : 0,
          offsitePresent ? 1 : 0,
          sha256Verified ? 1 : 0,
          decryptionVerified ? 1 : 0,
          archiveStructureVerified ? 1 : 0,
          internalChecksumsVerified ? 1 : 0,
          mainSqlIntegrity,
          piiSqlIntegrity,
          safetyCheckpoints.main?.bookmark || null,
          safetyCheckpoints.pii?.bookmark || null,
          failureCode,
          admin.user_id,
          checkedAt,
          checkedAt
        )
        .run();

    const readinessId =
      normalizePositiveInteger(
        insertResult?.meta?.last_row_id
      );

    if (!readinessId) {
      throw new Error(
        "restore_readiness_insert_failed"
      );
    }

    const readiness =
      await getLatestRestoreReadiness(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_readiness",
        targetType:
          "restore_request",
        targetId:
          String(restoreRequestId),
        result:
          ready ? "success" : "blocked",
        details: {
          restore_type:
            restoreRequest.restore_type,
          backup_run_id:
            restoreRequest.backup_run_id,
          readiness_status:
            ready ? "ready" : "blocked",
          preview_ready:
            previewReady,
          offsite_present:
            offsitePresent,
          sha256_verified:
            sha256Verified,
          decryption_verified:
            decryptionVerified,
          archive_structure_verified:
            archiveStructureVerified,
          internal_checksums_verified:
            internalChecksumsVerified,
          main_sql_integrity:
            mainSqlIntegrity,
          pii_sql_integrity:
            piiSqlIntegrity,
          main_checkpoint_ready:
            mainCheckpointReady,
          pii_checkpoint_ready:
            piiCheckpointReady,
          failure_type:
            failureCode,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      mode:
        "final_pre_restore_readiness",
      ready_for_execution:
        ready,
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      request:
        restoreRequest,
      validation,
      readiness,
      checks: {
        protected_request_active:
          requestActive,
        preview_validation_ready:
          previewReady,
        offsite_archive_present:
          offsitePresent,
        sha256_verified:
          sha256Verified,
        decryption_verified:
          decryptionVerified,
        archive_structure_verified:
          archiveStructureVerified,
        internal_checksums_verified:
          internalChecksumsVerified,
        main_sql_integrity:
          mainSqlIntegrity,
        pii_sql_integrity:
          piiSqlIntegrity,
        main_time_travel_checkpoint_available:
          mainCheckpointReady,
        pii_time_travel_checkpoint_available:
          piiCheckpointReady,
      },
      limitations: {
        destructive_restore_performed:
          false,
        restore_execution_endpoint_exposed:
          false,
      },
    };
  }
);


// =========================
// ADMIN ARM RESTORE EXECUTION
// Stage 2I-SR14F-D5A
//
// This endpoint creates a five-minute one-time execution credential only.
// It requires:
// - administrator authorization;
// - a still-active protected restore request;
// - the latest restore readiness to be READY and fresh;
// - current-password re-verification;
// - an exact confirmation phrase.
//
// The raw execution token is returned once. Only its SHA-256 digest is
// persisted. D5A still exposes NO destructive restore endpoint.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/arm",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const armLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-arm",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_ARM_LIMIT,
      });

    if (!armLimit.allowed) {
      return SecurityRateLimit.response(
        armLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    const currentPassword =
      typeof body.current_password ===
        "string"
        ? body.current_password
        : "";

    const confirmationPhrase =
      typeof body.confirmation_phrase ===
        "string"
        ? body.confirmation_phrase
        : "";

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id"
      };
    }

    if (
      !currentPassword ||
      currentPassword.length > 1024
    ) {
      return {
        error:
          "current_password_required"
      };
    }

    const expectedConfirmationPhrase =
      getRestoreExecutionArmConfirmationPhrase(
        restoreRequestId
      );

    if (
      confirmationPhrase !==
        expectedConfirmationPhrase
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_arm",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "confirmation_phrase_mismatch",
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_execution_arm_confirmation_incorrect",
        required_confirmation_phrase:
          expectedConfirmationPhrase,
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    await expireRestoreExecutionArms(
      ctx.env,
      admin.user_id
    );

    const restoreRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !restoreRequest ||
      restoreRequest.status !==
        "pending"
    ) {
      return {
        error:
          "restore_request_not_active"
      };
    }

    if (
      restoreRequest.restore_type !==
        "offsite_backup"
    ) {
      return {
        error:
          "restore_type_not_enabled"
      };
    }

    const readiness =
      await getLatestRestoreReadiness(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !readiness ||
      readiness.status !== "ready"
    ) {
      return {
        error:
          "restore_readiness_not_ready"
      };
    }

    if (
      !isRestoreReadinessFresh(
        readiness
      )
    ) {
      return {
        error:
          "restore_readiness_stale",
        max_age_minutes:
          RESTORE_READINESS_MAX_AGE_MINUTES,
      };
    }

    const readinessStillComplete =
      readiness.request_active === true &&
      readiness.preview_ready === true &&
      readiness.offsite_present === true &&
      readiness.sha256_verified === true &&
      readiness.decryption_verified === true &&
      readiness.archive_structure_verified === true &&
      readiness.internal_checksums_verified === true &&
      readiness.main_sql_integrity === "ok" &&
      readiness.pii_sql_integrity === "ok" &&
      Boolean(
        readiness.main_checkpoint_bookmark
      ) &&
      Boolean(
        readiness.pii_checkpoint_bookmark
      ) &&
      !readiness.failure_code;

    if (!readinessStillComplete) {
      return {
        error:
          "restore_readiness_incomplete"
      };
    }

    const existingArm =
      await getActiveRestoreExecutionArm(
        ctx.env,
        admin.user_id
      );

    if (existingArm) {
      return {
        error:
          "restore_execution_arm_already_active",
        active_execution_arm:
          existingArm,
      };
    }

    const passwordLimitKey =
      `user:${admin.user_id}`;

    const passwordLimitCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "admin-restore-password-failure",
        key:
          passwordLimitKey,
        windowSeconds:
          ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT
            .windowSeconds,
      });

    if (!passwordLimitCheck.allowed) {
      return SecurityRateLimit.response(
        passwordLimitCheck
      );
    }

    const user =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          password_hash,
          is_active
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
        .bind(
          admin.user_id
        )
        .first();

    if (
      !user ||
      Number(user.is_active) !== 1
    ) {
      return {
        error:
          "user_not_found_or_inactive"
      };
    }

    const passwordCheck =
      await verifyPassword(
        currentPassword,
        user.password_hash || ""
      );

    if (!passwordCheck.ok) {
      const failureResult =
        await SecurityRateLimit.recordFailure({
          env: ctx.env,
          scope:
            "admin-restore-password-failure",
          key:
            passwordLimitKey,
          ...ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT,
        });

      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_arm",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "password_incorrect",
            readiness_id:
              readiness.id,
            restore_execution_enabled:
              false,
          },
        }
      );

      if (!failureResult.allowed) {
        return SecurityRateLimit.response(
          failureResult
        );
      }

      return {
        error:
          "current_password_incorrect"
      };
    }

    await SecurityRateLimit.clear({
      env: ctx.env,
      scope:
        "admin-restore-password-failure",
      key:
        passwordLimitKey,
    });

    const executionToken =
      generateRestoreExecutionToken();

    const executionTokenHash =
      await sha256Hex(
        executionToken
      );

    const now =
      new Date();

    const armedAt =
      now.toISOString();

    const expiresAt =
      new Date(
        now.getTime() +
        RESTORE_EXECUTION_ARM_TTL_MINUTES *
          60 *
          1000
      ).toISOString();

    let insertResult;

    try {
      insertResult =
        await ctx.env.DB.prepare(`
          INSERT INTO restore_execution_arms (
            restore_request_id,
            readiness_id,
            status,
            execution_token_hash,
            armed_by,
            armed_at,
            expires_at,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, 'armed', ?, ?, ?, ?, ?, ?
          )
        `)
          .bind(
            restoreRequestId,
            readiness.id,
            executionTokenHash,
            admin.user_id,
            armedAt,
            expiresAt,
            armedAt,
            armedAt
          )
          .run();
    } catch (error) {
      const concurrentArm =
        await getActiveRestoreExecutionArm(
          ctx.env,
          admin.user_id
        );

      if (concurrentArm) {
        return {
          error:
            "restore_execution_arm_already_active",
          active_execution_arm:
            concurrentArm,
        };
      }

      throw error;
    }

    const armId =
      normalizePositiveInteger(
        insertResult?.meta?.last_row_id
      );

    if (!armId) {
      throw new Error(
        "restore_execution_arm_insert_failed"
      );
    }

    const arm =
      await getActiveRestoreExecutionArm(
        ctx.env,
        admin.user_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_execution_arm",
        targetType:
          "restore_execution_arm",
        targetId:
          String(armId),
        result:
          "success",
        details: {
          restore_request_id:
            restoreRequestId,
          readiness_id:
            readiness.id,
          ttl_minutes:
            RESTORE_EXECUTION_ARM_TTL_MINUTES,
          raw_execution_token_stored:
            false,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      mode:
        "restore_execution_armed",
      execution_arm:
        arm,
      execution_token:
        executionToken,
      execution_token_returned_once:
        true,
      token_storage:
        "sha256_only",
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      destructive_operations_exposed:
        false,
      warning:
        "Keep the execution token private. It expires in 5 minutes and is intended only for a later protected restore-execution phase.",
    };
  }
);


// =========================
// ADMIN RESTORE EXECUTION DRY RUN
// Stage 2I-SR14F-D5B-1
//
// Verifies the final execution barrier without consuming the arm and
// without starting any restore. The supplied raw token is hashed in memory
// and compared with the SHA-256 digest stored in D1. The raw token is never
// persisted, returned, or included in audit details.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/execution-dry-run",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const dryRunLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-execution-dry-run",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_EXECUTION_DRY_RUN_LIMIT,
      });

    if (!dryRunLimit.allowed) {
      return SecurityRateLimit.response(
        dryRunLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    const armId =
      normalizePositiveInteger(
        body.arm_id
      );

    const executionToken =
      typeof body.execution_token ===
        "string"
        ? body.execution_token
        : "";

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id",
        execution_allowed:
          false,
      };
    }

    if (!armId) {
      return {
        error:
          "invalid_restore_execution_arm_id",
        execution_allowed:
          false,
      };
    }

    // A generated token is 32 random bytes encoded as base64url.
    // Keep the validation deliberately narrow and never echo the value.
    if (
      executionToken.length < 40 ||
      executionToken.length > 64 ||
      !/^[A-Za-z0-9_-]+$/.test(
        executionToken
      )
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_dry_run",
          targetType:
            "restore_execution_arm",
          targetId:
            String(armId),
          result:
            "failure",
          details: {
            restore_request_id:
              restoreRequestId,
            failure_type:
              "execution_token_invalid_format",
            execution_allowed:
              false,
            token_logged:
              false,
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "execution_token_invalid",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    await expireRestoreExecutionArms(
      ctx.env,
      admin.user_id
    );

    const restoreRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !restoreRequest ||
      restoreRequest.status !==
        "pending"
    ) {
      return {
        error:
          "restore_request_not_active",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    if (
      restoreRequest.restore_type !==
        "offsite_backup"
    ) {
      return {
        error:
          "restore_type_not_enabled",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    const arm =
      await getRestoreExecutionArmForDryRun(
        ctx.env,
        armId,
        admin.user_id
      );

    if (
      !arm ||
      arm.status !== "armed" ||
      Number(
        arm.restore_request_id
      ) !== restoreRequestId
    ) {
      return {
        error:
          "restore_execution_arm_not_active",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    const armExpiresAt =
      Date.parse(
        arm.expires_at
      );

    if (
      !Number.isFinite(
        armExpiresAt
      ) ||
      armExpiresAt <= Date.now()
    ) {
      await expireRestoreExecutionArms(
        ctx.env,
        admin.user_id
      );

      return {
        error:
          "restore_execution_arm_expired",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    const readiness =
      await getLatestRestoreReadiness(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !readiness ||
      Number(readiness.id) !==
        Number(arm.readiness_id) ||
      readiness.status !== "ready"
    ) {
      return {
        error:
          "restore_readiness_not_ready",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    if (
      !isRestoreReadinessFresh(
        readiness
      )
    ) {
      return {
        error:
          "restore_readiness_stale",
        max_age_minutes:
          RESTORE_READINESS_MAX_AGE_MINUTES,
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    const readinessStillComplete =
      readiness.request_active === true &&
      readiness.preview_ready === true &&
      readiness.offsite_present === true &&
      readiness.sha256_verified === true &&
      readiness.decryption_verified === true &&
      readiness.archive_structure_verified === true &&
      readiness.internal_checksums_verified === true &&
      readiness.main_sql_integrity === "ok" &&
      readiness.pii_sql_integrity === "ok" &&
      Boolean(
        readiness.main_checkpoint_bookmark
      ) &&
      Boolean(
        readiness.pii_checkpoint_bookmark
      ) &&
      !readiness.failure_code;

    if (!readinessStillComplete) {
      return {
        error:
          "restore_readiness_incomplete",
        execution_allowed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    const suppliedTokenHash =
      await sha256Hex(
        executionToken
      );

    const tokenMatches =
      constantTimeEqualHex(
        suppliedTokenHash,
        arm.execution_token_hash
      );

    if (!tokenMatches) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_dry_run",
          targetType:
            "restore_execution_arm",
          targetId:
            String(armId),
          result:
            "failure",
          details: {
            restore_request_id:
              restoreRequestId,
            readiness_id:
              readiness.id,
            failure_type:
              "execution_token_mismatch",
            execution_allowed:
              false,
            token_logged:
              false,
            arm_consumed:
              false,
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "execution_token_incorrect",
        execution_allowed:
          false,
        arm_consumed:
          false,
        restore_execution_started:
          false,
        restore_execution_enabled:
          false,
        destructive_operations_exposed:
          false,
      };
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_execution_dry_run",
        targetType:
          "restore_execution_arm",
        targetId:
          String(armId),
        result:
          "success",
        details: {
          restore_request_id:
            restoreRequestId,
          readiness_id:
            readiness.id,
          execution_allowed:
            true,
          token_verified:
            true,
          token_logged:
            false,
          arm_consumed:
            false,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      mode:
        "restore_execution_dry_run",
      execution_allowed:
        true,
      token_verified:
        true,
      execution_arm: {
        id:
          Number(arm.id),
        restore_request_id:
          Number(
            arm.restore_request_id
          ),
        readiness_id:
          Number(
            arm.readiness_id
          ),
        status:
          arm.status,
        expires_at:
          arm.expires_at,
      },
      arm_consumed:
        false,
      restore_request_status:
        restoreRequest.status,
      readiness_status:
        readiness.status,
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      destructive_operations_exposed:
        false,
      dry_run_only:
        true,
    };
  }
);


// =========================
// ADMIN DISPATCH RESTORE EXECUTION
// Stage 2I-SR14F-D5B-2B
//
// CONTROL-PLANE ONLY in this stage.
// Consumes the arm exactly once, creates restore_executions journal entry,
// and dispatches a dedicated GitHub workflow. The workflow used in D5B-2B
// still performs NO destructive restore.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/execution/dispatch",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const dispatchLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-execution-dispatch",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_EXECUTION_DISPATCH_LIMIT,
      });

    if (!dispatchLimit.allowed) {
      return SecurityRateLimit.response(
        dispatchLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    const armId =
      normalizePositiveInteger(
        body.arm_id
      );

    const currentPassword =
      typeof body.current_password ===
        "string"
        ? body.current_password
        : "";

    const executionToken =
      typeof body.execution_token ===
        "string"
        ? body.execution_token
        : "";

    const confirmationPhrase =
      typeof body.confirmation_phrase ===
        "string"
        ? body.confirmation_phrase
        : "";

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id"
      };
    }

    if (!armId) {
      return {
        error:
          "invalid_restore_execution_arm_id"
      };
    }

    if (
      !currentPassword ||
      currentPassword.length > 1024
    ) {
      return {
        error:
          "current_password_required"
      };
    }

    if (
      executionToken.length < 40 ||
      executionToken.length > 64 ||
      !/^[A-Za-z0-9_-]+$/.test(
        executionToken
      )
    ) {
      return {
        error:
          "execution_token_invalid"
      };
    }

    const expectedConfirmationPhrase =
      getRestoreExecutionDispatchConfirmationPhrase(
        restoreRequestId
      );

    if (
      confirmationPhrase !==
        expectedConfirmationPhrase
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_dispatch",
          targetType:
            "restore_execution_arm",
          targetId:
            String(armId),
          result:
            "failure",
          details: {
            restore_request_id:
              restoreRequestId,
            failure_type:
              "confirmation_phrase_mismatch",
            token_logged:
              false,
            destructive_restore_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_execution_dispatch_confirmation_incorrect",
        required_confirmation_phrase:
          expectedConfirmationPhrase,
      };
    }

    const github =
      getGitHubRestoreExecutionConfiguration(
        ctx.env
      );

    if (!github.ok) {
      return {
        error:
          github.error
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    await expireRestoreExecutionArms(
      ctx.env,
      admin.user_id
    );

    const restoreRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !restoreRequest ||
      restoreRequest.status !==
        "pending"
    ) {
      return {
        error:
          "restore_request_not_active"
      };
    }

    if (
      restoreRequest.restore_type !==
        "offsite_backup"
    ) {
      return {
        error:
          "restore_type_not_enabled"
      };
    }

    const arm =
      await getRestoreExecutionArmForDryRun(
        ctx.env,
        armId,
        admin.user_id
      );

    if (
      !arm ||
      arm.status !== "armed" ||
      Number(
        arm.restore_request_id
      ) !== restoreRequestId
    ) {
      return {
        error:
          "restore_execution_arm_not_active"
      };
    }

    const readiness =
      await getLatestRestoreReadiness(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !readiness ||
      Number(readiness.id) !==
        Number(arm.readiness_id) ||
      readiness.status !== "ready"
    ) {
      return {
        error:
          "restore_readiness_not_ready"
      };
    }

    if (
      !isRestoreReadinessFresh(
        readiness
      )
    ) {
      return {
        error:
          "restore_readiness_stale",
        max_age_minutes:
          RESTORE_READINESS_MAX_AGE_MINUTES,
      };
    }

    const readinessStillComplete =
      readiness.request_active === true &&
      readiness.preview_ready === true &&
      readiness.offsite_present === true &&
      readiness.sha256_verified === true &&
      readiness.decryption_verified === true &&
      readiness.archive_structure_verified === true &&
      readiness.internal_checksums_verified === true &&
      readiness.main_sql_integrity === "ok" &&
      readiness.pii_sql_integrity === "ok" &&
      Boolean(
        readiness.main_checkpoint_bookmark
      ) &&
      Boolean(
        readiness.pii_checkpoint_bookmark
      ) &&
      !readiness.failure_code;

    if (!readinessStillComplete) {
      return {
        error:
          "restore_readiness_incomplete"
      };
    }

    const suppliedTokenHash =
      await sha256Hex(
        executionToken
      );

    if (
      !constantTimeEqualHex(
        suppliedTokenHash,
        arm.execution_token_hash
      )
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_execution_dispatch",
          targetType:
            "restore_execution_arm",
          targetId:
            String(armId),
          result:
            "failure",
          details: {
            restore_request_id:
              restoreRequestId,
            readiness_id:
              readiness.id,
            failure_type:
              "execution_token_mismatch",
            token_logged:
              false,
            destructive_restore_enabled:
              false,
          },
        }
      );

      return {
        error:
          "execution_token_incorrect"
      };
    }

    const passwordLimitKey =
      `user:${admin.user_id}`;

    const passwordLimitCheck =
      await SecurityRateLimit.check({
        env: ctx.env,
        scope:
          "admin-restore-password-failure",
        key:
          passwordLimitKey,
        windowSeconds:
          ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT
            .windowSeconds,
      });

    if (!passwordLimitCheck.allowed) {
      return SecurityRateLimit.response(
        passwordLimitCheck
      );
    }

    const user =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          password_hash,
          is_active
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
        .bind(
          admin.user_id
        )
        .first();

    if (
      !user ||
      Number(user.is_active) !== 1
    ) {
      return {
        error:
          "user_not_found_or_inactive"
      };
    }

    const passwordCheck =
      await verifyPassword(
        currentPassword,
        user.password_hash || ""
      );

    if (!passwordCheck.ok) {
      const failureResult =
        await SecurityRateLimit.recordFailure({
          env: ctx.env,
          scope:
            "admin-restore-password-failure",
          key:
            passwordLimitKey,
          ...ADMIN_RESTORE_PASSWORD_FAILURE_LIMIT,
        });

      if (!failureResult.allowed) {
        return SecurityRateLimit.response(
          failureResult
        );
      }

      return {
        error:
          "current_password_incorrect"
      };
    }

    await SecurityRateLimit.clear({
      env: ctx.env,
      scope:
        "admin-restore-password-failure",
      key:
        passwordLimitKey,
    });

    const backupRun =
      await getBackupRunById(
        ctx.env,
        restoreRequest.backup_run_id
      );

    if (
      !backupRun ||
      backupRun.status !== "success" ||
      !backupRun.archive_name ||
      !backupRun.archive_sha256 ||
      backupRun.archive_name !==
        restoreRequest.archive_name ||
      backupRun.archive_sha256 !==
        restoreRequest.archive_sha256 ||
      backupRun.main_integrity !== "ok" ||
      backupRun.pii_integrity !== "ok"
    ) {
      return {
        error:
          "backup_run_not_restorable"
      };
    }

    const targetTimestamp =
      backupRun.completed_at ||
      backupRun.created_at;

    if (!targetTimestamp) {
      return {
        error:
          "restore_target_timestamp_unavailable"
      };
    }

    const nowIso =
      new Date().toISOString();

    let batchResults;

    try {
      batchResults =
        await ctx.env.DB.batch([
          ctx.env.DB.prepare(`
            INSERT INTO restore_executions (
              restore_request_id,
              readiness_id,
              execution_arm_id,
              backup_run_id,
              status,
              archive_name,
              archive_sha256,
              main_pre_restore_bookmark,
              pii_pre_restore_bookmark,
              target_timestamp,
              requested_by,
              requested_at,
              created_at,
              updated_at
            )
            SELECT
              rr.restore_request_id,
              rr.id,
              arm.id,
              rq.backup_run_id,
              'requested',
              rq.archive_name,
              rq.archive_sha256,
              rr.main_checkpoint_bookmark,
              rr.pii_checkpoint_bookmark,
              ?,
              ?,
              ?,
              ?,
              ?
            FROM restore_execution_arms arm
            JOIN restore_readiness rr
              ON rr.id = arm.readiness_id
            JOIN restore_requests rq
              ON rq.id = arm.restore_request_id
            WHERE arm.id = ?
              AND arm.armed_by = ?
              AND arm.status = 'armed'
              AND datetime(arm.expires_at) >
                  datetime(?)
              AND rq.id = ?
              AND rq.status = 'pending'
              AND rr.status = 'ready'
              AND rr.request_active = 1
              AND rr.preview_ready = 1
              AND rr.offsite_present = 1
              AND rr.sha256_verified = 1
              AND rr.decryption_verified = 1
              AND rr.archive_structure_verified = 1
              AND rr.internal_checksums_verified = 1
              AND rr.main_sql_integrity = 'ok'
              AND rr.pii_sql_integrity = 'ok'
              AND rr.failure_code IS NULL
          `)
            .bind(
              targetTimestamp,
              admin.user_id,
              nowIso,
              nowIso,
              nowIso,
              armId,
              admin.user_id,
              nowIso,
              restoreRequestId
            ),

          ctx.env.DB.prepare(`
            UPDATE restore_execution_arms
            SET
              status = 'consumed',
              consumed_at = ?,
              updated_at = ?
            WHERE id = ?
              AND armed_by = ?
              AND status = 'armed'
              AND EXISTS (
                SELECT 1
                FROM restore_executions re
                WHERE re.execution_arm_id =
                  restore_execution_arms.id
              )
          `)
            .bind(
              nowIso,
              nowIso,
              armId,
              admin.user_id
            ),
        ]);
    } catch (error) {
      const existing =
        await ctx.env.DB.prepare(`
          SELECT id, status
          FROM restore_executions
          WHERE execution_arm_id = ?
          LIMIT 1
        `)
          .bind(
            armId
          )
          .first();

      if (existing) {
        return {
          error:
            "restore_execution_arm_already_consumed",
          restore_execution_id:
            Number(existing.id),
          status:
            existing.status,
        };
      }

      throw error;
    }

    const insertChanges =
      Number(
        batchResults?.[0]?.meta
          ?.changes || 0
      );

    const armChanges =
      Number(
        batchResults?.[1]?.meta
          ?.changes || 0
      );

    if (
      insertChanges !== 1 ||
      armChanges !== 1
    ) {
      return {
        error:
          "restore_execution_authorization_failed"
      };
    }

    const execution =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          status
        FROM restore_executions
        WHERE execution_arm_id = ?
        LIMIT 1
      `)
        .bind(
          armId
        )
        .first();

    if (!execution) {
      throw new Error(
        "restore_execution_journal_missing"
      );
    }

    const executionId =
      Number(execution.id);

    const dispatchUrl =
      `https://api.github.com/repos/${encodeURIComponent(
        github.owner
      )}/${encodeURIComponent(
        github.repo
      )}/actions/workflows/${encodeURIComponent(
        github.workflow
      )}/dispatches`;

    let dispatchResponse;

    try {
      dispatchResponse =
        await fetch(
          dispatchUrl,
          {
            method: "POST",
            headers: {
              "Accept":
                "application/vnd.github+json",
              "Authorization":
                `Bearer ${github.token}`,
              "Content-Type":
                "application/json",
              "X-GitHub-Api-Version":
                "2022-11-28",
              "User-Agent":
                "MVX-Housing-System",
            },
            body:
              JSON.stringify({
                ref: "main",
                inputs: {
                  restore_execution_id:
                    String(
                      executionId
                    ),
                  control_plane_only:
                    "true",
                },
              }),
          }
        );
    } catch (error) {
      const failedAt =
        new Date().toISOString();

      await ctx.env.DB.prepare(`
        UPDATE restore_executions
        SET
          status = 'failed',
          failure_code =
            'GITHUB_DISPATCH_ERROR',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
          AND status = 'requested'
      `)
        .bind(
          failedAt,
          failedAt,
          executionId
        )
        .run();

      return {
        error:
          "restore_execution_dispatch_failed",
        restore_execution_id:
          executionId,
        arm_consumed:
          true,
        destructive_restore_enabled:
          false,
      };
    }

    if (!dispatchResponse.ok) {
      const failedAt =
        new Date().toISOString();

      await ctx.env.DB.prepare(`
        UPDATE restore_executions
        SET
          status = 'failed',
          failure_code =
            'GITHUB_DISPATCH_FAILED',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
          AND status = 'requested'
      `)
        .bind(
          failedAt,
          failedAt,
          executionId
        )
        .run();

      return {
        error:
          "restore_execution_dispatch_failed",
        restore_execution_id:
          executionId,
        github_status:
          Number(
            dispatchResponse.status
          ),
        arm_consumed:
          true,
        destructive_restore_enabled:
          false,
      };
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_execution_dispatch",
        targetType:
          "restore_execution",
        targetId:
          String(executionId),
        result:
          "success",
        details: {
          restore_request_id:
            restoreRequestId,
          readiness_id:
            readiness.id,
          execution_arm_id:
            armId,
          backup_run_id:
            restoreRequest.backup_run_id,
          arm_consumed:
            true,
          token_verified:
            true,
          token_logged:
            false,
          control_plane_only:
            true,
          destructive_restore_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      mode:
        "restore_execution_dispatched_control_plane",
      restore_execution_id:
        executionId,
      restore_request_id:
        restoreRequestId,
      execution_arm_id:
        armId,
      arm_consumed:
        true,
      github_workflow:
        github.workflow,
      dispatch_accepted:
        true,
      control_plane_only:
        true,
      destructive_restore_started:
        false,
      destructive_restore_enabled:
        false,
      restore_execution_enabled:
        false,
    };
  }
);


// =========================
// ADMIN CANCEL RESTORE EXECUTION ARM
// Stage 2I-SR14F-D5A
//
// Cancels only the administrator's own still-live arm.
// No restore execution is performed.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/arm/cancel",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const armId =
      normalizePositiveInteger(
        body.arm_id
      );

    if (!armId) {
      return {
        error:
          "invalid_restore_execution_arm_id"
      };
    }

    await expireRestoreExecutionArms(
      ctx.env,
      admin.user_id
    );

    const nowIso =
      new Date().toISOString();

    const updateResult =
      await ctx.env.DB.prepare(`
        UPDATE restore_execution_arms
        SET
          status = 'cancelled',
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
          AND armed_by = ?
          AND status = 'armed'
          AND datetime(expires_at) > datetime(?)
      `)
        .bind(
          nowIso,
          nowIso,
          armId,
          admin.user_id,
          nowIso
        )
        .run();

    if (
      Number(
        updateResult?.meta?.changes ||
        0
      ) !== 1
    ) {
      return {
        error:
          "restore_execution_arm_not_active"
      };
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_execution_arm_cancel",
        targetType:
          "restore_execution_arm",
        targetId:
          String(armId),
        result:
          "success",
        details: {
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      destructive_operations_exposed:
        false,
    };
  }
);


// =========================
// ADMIN CANCEL PROTECTED RESTORE REQUEST
// Stage 2I-SR14F-B
//
// Cancellation is deliberately non-destructive. It can only revoke
// the requesting administrator's own still-pending intent record.
// No restore execution, Cloudflare write, MEGA write, or R2 write
// is performed by this route.
// =========================
Router.register(
  "POST",
  "/api/admin/restore/cancel",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const cancelLimit =
      await SecurityRateLimit.consume({
        env: ctx.env,
        scope:
          "admin-restore-cancel",
        key:
          `user:${admin.user_id}`,
        ...ADMIN_RESTORE_CANCEL_LIMIT,
      });

    if (!cancelLimit.allowed) {
      return SecurityRateLimit.response(
        cancelLimit
      );
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const restoreRequestId =
      normalizePositiveInteger(
        body.restore_request_id
      );

    if (!restoreRequestId) {
      return {
        error:
          "invalid_restore_request_id"
      };
    }

    await ensureRestoreRequestSchema(
      ctx.env
    );

    // Move an already elapsed request to 'expired' first. This keeps
    // cancellation semantics strict: only a live pending request can
    // become cancelled.
    await expireRestoreRequests(
      ctx.env,
      admin.user_id
    );

    const existingRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    if (
      !existingRequest ||
      existingRequest.status !==
        "pending"
    ) {
      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_request_cancel",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "request_not_active",
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_request_not_active"
      };
    }

    const nowIso =
      new Date().toISOString();

    const updateResult =
      await ctx.env.DB.prepare(`
        UPDATE restore_requests
        SET
          status = 'cancelled',
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
          AND requested_by = ?
          AND status = 'pending'
          AND datetime(expires_at) >
            datetime(?)
      `)
        .bind(
          nowIso,
          nowIso,
          restoreRequestId,
          admin.user_id,
          nowIso
        )
        .run();

    if (
      Number(
        updateResult?.meta?.changes ||
        0
      ) !== 1
    ) {
      // A race or expiry between the read and update must never turn
      // into a successful-looking cancellation.
      await expireRestoreRequests(
        ctx.env,
        admin.user_id
      );

      await SecurityAudit.recordSafe(
        ctx,
        {
          actorUserId:
            admin.user_id,
          action:
            "admin.restore_request_cancel",
          targetType:
            "restore_request",
          targetId:
            String(
              restoreRequestId
            ),
          result:
            "failure",
          details: {
            failure_type:
              "request_not_active",
            restore_execution_enabled:
              false,
          },
        }
      );

      return {
        error:
          "restore_request_not_active"
      };
    }

    const cancelledRequest =
      await getRestoreRequestById(
        ctx.env,
        restoreRequestId,
        admin.user_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.restore_request_cancel",
        targetType:
          "restore_request",
        targetId:
          String(
            restoreRequestId
          ),
        details: {
          restore_type:
            cancelledRequest
              ?.restore_type ||
            existingRequest
              .restore_type,
          backup_run_id:
            cancelledRequest
              ?.backup_run_id ||
            existingRequest
              .backup_run_id,
          restore_execution_enabled:
            false,
        },
      }
    );

    return {
      ok: true,
      restore_execution_started:
        false,
      restore_execution_enabled:
        false,
      request:
        cancelledRequest,
    };
  }
);

// =========================
// ADMIN WATER REPORTING SETTINGS
// =========================
Router.register(
  "GET",
  "/api/admin/water-reporting-settings",
  async (ctx) => {
    const admin = await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await syncWaterReportingPeriodStatuses(ctx.env);

    const settings = await getWaterReportingSettings(ctx.env);

    const managedMonth = await resolveManagedWaterReportingMonth(
      ctx.env,
      settings.timezone
    );

    const calculatedPeriod = calculateWaterReportingPeriod({
      year: managedMonth.year,
      month: managedMonth.month,
      daysBeforeMonthEnd: Number(
        settings.days_before_month_end
      ),
      daysAfterMonthEnd: Number(
        settings.days_after_month_end
      ),
      timeZone: settings.timezone,
    });

    return {
      ok: true,
      settings,
      managed_period: managedMonth.existing_period,
      calculated_period: calculatedPeriod,
    };
  }
);

Router.register(
  "POST",
  "/api/admin/water-reporting-settings",
  async (ctx) => {
    const admin = await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body = await ctx.request
      .json()
      .catch(() => ({}));

    const daysBeforeMonthEnd = Number(
      body.days_before_month_end
    );

    const daysAfterMonthEnd = Number(
      body.days_after_month_end
    );

    const timeZone = String(
      body.timezone || DEFAULT_WATER_REPORTING_TIMEZONE
    ).trim();

    if (
      !Number.isInteger(daysBeforeMonthEnd) ||
      daysBeforeMonthEnd < 0 ||
      daysBeforeMonthEnd > 31
    ) {
      return {
        error: "invalid_days_before_month_end"
      };
    }

    if (
      !Number.isInteger(daysAfterMonthEnd) ||
      daysAfterMonthEnd < 0 ||
      daysAfterMonthEnd > 31
    ) {
      return {
        error: "invalid_days_after_month_end"
      };
    }

    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone,
      }).format(new Date());
    } catch (error) {
      return {
        error: "invalid_water_reporting_timezone"
      };
    }

    await ensureWaterReportingSettingsTable(ctx.env);

    const periodResult = await upsertManagedWaterReportingPeriod({
      env: ctx.env,
      adminUserId: admin.user_id,
      daysBeforeMonthEnd,
      daysAfterMonthEnd,
      timeZone,
    });

    if (!periodResult.ok) {
      return periodResult;
    }

    const nowIso = new Date().toISOString();

    await ctx.env.DB.prepare(`
      UPDATE water_reporting_settings
      SET
        days_before_month_end = ?,
        days_after_month_end = ?,
        timezone = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?
    `)
      .bind(
        daysBeforeMonthEnd,
        daysAfterMonthEnd,
        timeZone,
        admin.user_id,
        nowIso,
        WATER_REPORTING_SETTINGS_ID
      )
      .run();

    return {
      ok: true,
      settings: await getWaterReportingSettings(ctx.env),
      period_result: periodResult,
    };
  }
);

// =========================
// ADMIN WATER READING ENTRY PERIODS
// Current open period + latest closed period
// =========================
Router.register(
  "GET",
  "/api/admin/water-reading-entry-periods",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const nowIso =
      new Date().toISOString();

    const openPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at
        FROM water_reporting_periods
        WHERE status = 'open'
          AND datetime(?) >=
            datetime(collection_opens_at)
          AND datetime(?) <=
            datetime(collection_closes_at)
        ORDER BY
          period_year DESC,
          period_month DESC
        LIMIT 1
      `)
        .bind(
          nowIso,
          nowIso
        )
        .first();

    const latestClosedPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at
        FROM water_reporting_periods
        WHERE status = 'closed'
        ORDER BY
          period_year DESC,
          period_month DESC
        LIMIT 1
      `)
        .first();

    const periods = [];

    if (openPeriod) {
      periods.push(openPeriod);
    }

    if (
      latestClosedPeriod &&
      !periods.some(
        (period) =>
          Number(period.id) ===
          Number(
            latestClosedPeriod.id
          )
      )
    ) {
      periods.push(
        latestClosedPeriod
      );
    }

    return {
      ok: true,
      periods,
    };
  }
);

// =========================
// ADMIN SUBMIT WATER READING
// Open period or latest closed period only
// =========================
Router.register(
  "POST",
  "/api/admin/submit-water-reading",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const meterId =
      Number(body.meter_id);

    const readingValue =
      Number(body.reading_value);

    const reportingPeriodId =
      Number(
        body.reporting_period_id
      );

    const readingDate =
      String(
        body.reading_date || ""
      ).trim();

    const submissionSource =
      String(
        body.submission_source || ""
      )
        .trim()
        .toLowerCase();

    const sourceNote =
      String(
        body.source_note || ""
      ).trim();

    const confirmClosedPeriod =
      body.confirm_closed_period ===
        true;

    const allowedSources = [
      "paper_note",
      "email",
      "phone",
      "admin_manual",
    ];

    if (
      !Number.isInteger(meterId) ||
      meterId <= 0
    ) {
      return {
        error: "invalid_meter_id"
      };
    }

    if (
      !Number.isInteger(
        readingValue
      ) ||
      readingValue < 0
    ) {
      return {
        error:
          "invalid_reading_value"
      };
    }

    if (
      !Number.isInteger(
        reportingPeriodId
      ) ||
      reportingPeriodId <= 0
    ) {
      return {
        error:
          "invalid_reporting_period_id"
      };
    }

    if (
      !isValidIsoDate(
        readingDate
      )
    ) {
      return {
        error:
          "invalid_reading_date"
      };
    }

    if (
      !allowedSources.includes(
        submissionSource
      )
    ) {
      return {
        error:
          "invalid_submission_source"
      };
    }

    if (!sourceNote) {
      return {
        error: "missing_source_note"
      };
    }

    const nowIso =
      new Date().toISOString();

    const openPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at
        FROM water_reporting_periods
        WHERE status = 'open'
          AND datetime(?) >=
            datetime(collection_opens_at)
          AND datetime(?) <=
            datetime(collection_closes_at)
        ORDER BY
          period_year DESC,
          period_month DESC
        LIMIT 1
      `)
        .bind(
          nowIso,
          nowIso
        )
        .first();

    const latestClosedPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at
        FROM water_reporting_periods
        WHERE status = 'closed'
        ORDER BY
          period_year DESC,
          period_month DESC
        LIMIT 1
      `)
        .first();

    const availablePeriods = [
      openPeriod,
      latestClosedPeriod,
    ].filter(Boolean);

    const selectedPeriod =
      availablePeriods.find(
        (period) =>
          Number(period.id) ===
          reportingPeriodId
      );

    if (!selectedPeriod) {
      return {
        error:
          "reporting_period_not_available_for_admin_entry"
      };
    }

    if (
      selectedPeriod.status ===
        "closed" &&
      !confirmClosedPeriod
    ) {
      return {
        error:
          "closed_period_confirmation_required"
      };
    }

    const expectedPrefix =
      `${selectedPeriod.period_year}-${String(
        selectedPeriod.period_month
      ).padStart(2, "0")}-`;

    if (
      !readingDate.startsWith(
        expectedPrefix
      )
    ) {
      return {
        error:
          "reading_date_outside_reporting_month"
      };
    }

    const meter =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          active
        FROM water_meters
        WHERE id = ?
      `)
        .bind(meterId)
        .first();

    if (
      !meter ||
      Number(meter.active) !== 1
    ) {
      return {
        error:
          "meter_not_found_or_inactive"
      };
    }

    const existingReading =
      await ctx.env.DB.prepare(`
        SELECT id
        FROM water_meter_readings
        WHERE meter_id = ?
          AND reporting_period_id = ?
          AND status = 'active'
        ORDER BY id DESC
        LIMIT 1
      `)
        .bind(
          meterId,
          selectedPeriod.id
        )
        .first();

    if (existingReading) {
      return {
        error:
          "reading_already_submitted_for_period"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        INSERT INTO water_meter_readings (
          meter_id,
          reading_value,
          reading_date,
          submitted_by,
          status,
          reporting_period_id,
          submitted_at,
          submission_source,
          source_note
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          'active',
          ?,
          ?,
          ?,
          ?
        )
      `)
        .bind(
          meterId,
          readingValue,
          readingDate,
          admin.user_id,
          selectedPeriod.id,
          nowIso,
          submissionSource,
          sourceNote
        )
        .run();

    const readingId =
      Number(
        result.meta.last_row_id
      );

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.water_reading_submit",
        targetType:
          "water_reading",
        targetId:
          String(readingId),
        details: {
          meter_id:
            meterId,
          reporting_period_id:
            Number(
              selectedPeriod.id
            ),
          period_status:
            selectedPeriod.status,
          submission_source:
            submissionSource,
          late_entry:
            selectedPeriod.status ===
              "closed",
        },
      }
    );

    return {
      ok: true,
      reading_id:
        readingId,
      reporting_period_id:
        selectedPeriod.id,
      period_status:
        selectedPeriod.status,
      late_entry:
        selectedPeriod.status ===
        "closed",
    };
  }
);

// =========================
// ADMIN CURRENT WATER REPORTING PERIOD
// =========================
Router.register(
  "GET",
  "/api/admin/current-water-reporting-period",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const nowIso =
      new Date().toISOString();

    const openPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at,
          opened_at,
          opened_by,
          closed_at,
          closed_by,
          finalized_at,
          finalized_by,
          notes

        FROM water_reporting_periods

        WHERE status = 'open'
          AND datetime(?) >=
            datetime(collection_opens_at)
          AND datetime(?) <=
            datetime(collection_closes_at)

        ORDER BY
          period_year DESC,
          period_month DESC

        LIMIT 1
      `)
        .bind(
          nowIso,
          nowIso
        )
        .first();

    if (openPeriod) {
      return {
        period: openPeriod,
        selection_reason:
          "current_open"
      };
    }

    const unfinishedPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at,
          opened_at,
          opened_by,
          closed_at,
          closed_by,
          finalized_at,
          finalized_by,
          notes

        FROM water_reporting_periods

        WHERE status IN (
          'scheduled',
          'closed'
        )

        ORDER BY
          CASE
            WHEN status = 'closed'
              THEN 0
            ELSE 1
          END,
          period_year DESC,
          period_month DESC

        LIMIT 1
      `)
        .first();

    if (unfinishedPeriod) {
      return {
        period: unfinishedPeriod,
        selection_reason:
          unfinishedPeriod.status ===
            "closed"
            ? "latest_closed"
            : "latest_scheduled"
      };
    }

    const finalizedPeriod =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at,
          opened_at,
          opened_by,
          closed_at,
          closed_by,
          finalized_at,
          finalized_by,
          notes

        FROM water_reporting_periods

        WHERE status = 'finalized'

        ORDER BY
          period_year DESC,
          period_month DESC

        LIMIT 1
      `)
        .first();

    if (finalizedPeriod) {
      return {
        period: finalizedPeriod,
        selection_reason:
          "latest_finalized"
      };
    }

    return {
      error:
        "reporting_period_not_found"
    };
  }
);

// =========================
// ADMIN WATER MONTHLY REPORT
// =========================
Router.register(
  "GET",
  "/api/admin/water-monthly-report",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const year =
      Number(
        ctx.url.searchParams.get(
          "year"
        )
      );

    const month =
      Number(
        ctx.url.searchParams.get(
          "month"
        )
      );

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return {
        error: "invalid_year"
      };
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return {
        error: "invalid_month"
      };
    }

    const period =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          period_year,
          period_month,
          status,
          collection_opens_at,
          collection_closes_at,
          opened_at,
          opened_by,
          closed_at,
          closed_by,
          finalized_at,
          finalized_by,
          notes

        FROM water_reporting_periods

        WHERE period_year = ?
          AND period_month = ?
      `)
        .bind(
          year,
          month
        )
        .first();

    if (!period) {
      return {
        error:
          "reporting_period_not_found"
      };
    }

    const periodStart =
      `${year}-${String(
        month
      ).padStart(2, "0")}-01`;

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          a.id AS apartment_id,
          a.number AS apartment_number,

          wm.id AS meter_id,
          wm.type,
          wm.serial_number,

          r.code AS riser_code,
          ar.local_label,

          (
            SELECT wmr.id
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.status = 'active'
              AND wmr.reporting_period_id = ?
            ORDER BY
              wmr.reading_date DESC,
              wmr.id DESC
            LIMIT 1
          ) AS current_reading_id,

          (
            SELECT wmr.reading_value
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.status = 'active'
              AND wmr.reporting_period_id = ?
            ORDER BY
              wmr.reading_date DESC,
              wmr.id DESC
            LIMIT 1
          ) AS current_reading,

          (
            SELECT wmr.reading_date
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.status = 'active'
              AND wmr.reporting_period_id = ?
            ORDER BY
              wmr.reading_date DESC,
              wmr.id DESC
            LIMIT 1
          ) AS current_reading_date,

          (
            SELECT previous.reading_value

            FROM water_meter_readings previous

            LEFT JOIN water_reporting_periods previous_period
              ON previous_period.id =
                previous.reporting_period_id

            WHERE previous.meter_id = wm.id
              AND previous.status = 'active'
              AND (
                (
                  previous_period.id IS NOT NULL
                  AND (
                    previous_period.period_year < ?
                    OR (
                      previous_period.period_year = ?
                      AND previous_period.period_month < ?
                    )
                  )
                )
                OR (
                  previous.reporting_period_id IS NULL
                  AND date(previous.reading_date) <= date((
                    SELECT current_initial_target.reading_date
                    FROM water_meter_readings current_initial_target
                    WHERE current_initial_target.meter_id = wm.id
                      AND current_initial_target.status = 'active'
                      AND current_initial_target.reporting_period_id = ?
                    ORDER BY
                      current_initial_target.reading_date DESC,
                      current_initial_target.id DESC
                    LIMIT 1
                  ))
                )
              )

            ORDER BY
              COALESCE(
                previous_period.period_year,
                CAST(
                  substr(previous.reading_date, 1, 4)
                  AS INTEGER
                )
              ) DESC,
              COALESCE(
                previous_period.period_month,
                CAST(
                  substr(previous.reading_date, 6, 2)
                  AS INTEGER
                )
              ) DESC,
              previous.submitted_at DESC,
              previous.id DESC

            LIMIT 1
          ) AS previous_reading,

          (
            SELECT previous.reading_date

            FROM water_meter_readings previous

            LEFT JOIN water_reporting_periods previous_period
              ON previous_period.id =
                previous.reporting_period_id

            WHERE previous.meter_id = wm.id
              AND previous.status = 'active'
              AND (
                (
                  previous_period.id IS NOT NULL
                  AND (
                    previous_period.period_year < ?
                    OR (
                      previous_period.period_year = ?
                      AND previous_period.period_month < ?
                    )
                  )
                )
                OR (
                  previous.reporting_period_id IS NULL
                  AND date(previous.reading_date) <= date((
                    SELECT current_initial_target.reading_date
                    FROM water_meter_readings current_initial_target
                    WHERE current_initial_target.meter_id = wm.id
                      AND current_initial_target.status = 'active'
                      AND current_initial_target.reporting_period_id = ?
                    ORDER BY
                      current_initial_target.reading_date DESC,
                      current_initial_target.id DESC
                    LIMIT 1
                  ))
                )
              )

            ORDER BY
              COALESCE(
                previous_period.period_year,
                CAST(
                  substr(previous.reading_date, 1, 4)
                  AS INTEGER
                )
              ) DESC,
              COALESCE(
                previous_period.period_month,
                CAST(
                  substr(previous.reading_date, 6, 2)
                  AS INTEGER
                )
              ) DESC,
              previous.submitted_at DESC,
              previous.id DESC

            LIMIT 1
          ) AS previous_reading_date

        FROM water_meters wm

        JOIN apartments a
          ON a.id = wm.apartment_id

        LEFT JOIN apartment_risers ar
          ON ar.id =
            wm.apartment_riser_id

        LEFT JOIN risers r
          ON r.id = ar.riser_id

        WHERE wm.active = 1

        ORDER BY
          a.number ASC,
          wm.type ASC,
          r.code ASC,
          wm.id ASC
      `)
        .bind(
          period.id,
          period.id,
          period.id,

          year,
          year,
          month,
          period.id,

          year,
          year,
          month,
          period.id
        )
        .all();

    const rows =
      (result.results || [])
        .map((row) => {

          const current =
            row.current_reading ===
              null ||
            row.current_reading ===
              undefined
              ? null
              : Number(
                  row.current_reading
                );

          const previous =
            row.previous_reading ===
              null ||
            row.previous_reading ===
              undefined
              ? null
              : Number(
                  row.previous_reading
                );

          const consumption =
            current !== null &&
            previous !== null
              ? current - previous
              : null;

          let status = "complete";

          if (current === null) {
            status =
              "missing_current";
          } else if (
            previous === null
          ) {
            status =
              "missing_previous";
          } else if (
            consumption < 0
          ) {
            status =
              "negative_consumption";
          }

          return {
            ...row,
            consumption,
            status,
          };
        });

    const apartmentIds =
      new Set(
        rows.map(
          (row) =>
            row.apartment_id
        )
      );

    const apartmentSubmissionMap =
      new Map();

    for (const row of rows) {

      if (
        !apartmentSubmissionMap.has(
          row.apartment_id
        )
      ) {
        apartmentSubmissionMap.set(
          row.apartment_id,
          {
            apartment_number:
              row.apartment_number,
            total: 0,
            submitted: 0,
          }
        );
      }

      const item =
        apartmentSubmissionMap.get(
          row.apartment_id
        );

      item.total += 1;

      if (
        row.current_reading !== null
      ) {
        item.submitted += 1;
      }
    }

    const submittedApartments =
      Array.from(
        apartmentSubmissionMap.values()
      ).filter(
        (item) =>
          item.total > 0 &&
          item.submitted ===
            item.total
      );

    const missingApartments =
      Array.from(
        apartmentSubmissionMap.entries()
      )
        .filter(
          ([, item]) =>
            item.submitted <
            item.total
        )
        .map(
          ([
            apartmentId,
            item,
          ]) => ({
            apartment_id:
              apartmentId,
            apartment_number:
              item.apartment_number,
            missing_meter_count:
              item.total -
              item.submitted,
          })
        )
        .sort(
          (a, b) =>
            Number(
              a.apartment_number
            ) -
            Number(
              b.apartment_number
            )
        );

    const sumConsumption =
      (type) =>
        rows
          .filter(
            (row) =>
              row.type === type &&
              typeof row.consumption ===
                "number" &&
              row.consumption >= 0
          )
          .reduce(
            (
              total,
              row
            ) =>
              total +
              row.consumption,
            0
          );

    const countMeters =
      (predicate) =>
        rows.filter(predicate).length;

    return {
      period,

      summary: {
        apartments_total:
          apartmentIds.size,

        apartments_submitted:
          submittedApartments.length,

        apartments_missing:
          missingApartments.length,

        meters_total:
          rows.length,

        meters_submitted:
          countMeters(
            (row) =>
              row.current_reading !==
              null
          ),

        meters_missing:
          countMeters(
            (row) =>
              row.current_reading ===
              null
          ),

        meters_missing_previous:
          countMeters(
            (row) =>
              row.status ===
              "missing_previous"
          ),

        meters_negative_consumption:
          countMeters(
            (row) =>
              row.status ===
              "negative_consumption"
          ),

        cold_consumption:
          sumConsumption("cold"),

        hot_consumption:
          sumConsumption("hot"),
      },

      missing_apartments:
        missingApartments,

      rows,
    };
  }
);

// =========================
// ADMIN WATER READING HISTORY
// =========================
Router.register(
  "GET",
  "/api/admin/water-readings",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          wmr.id AS reading_id,

          a.id AS apartment_id,
          a.number AS apartment_number,

          wm.id AS meter_id,
          wm.type,
          wm.serial_number,

          r.code AS riser_code,
          ar.local_label,

          wmr.reading_value,
          wmr.reading_date,
          wmr.created_at,
          wmr.submitted_at,

          wmr.status,
          wmr.submission_source,
          wmr.source_note,

          wmr.superseded_by_reading_id,
          wmr.correction_reason,
          wmr.corrected_at,

          wmr.reporting_period_id,
          wrp.period_year,
          wrp.period_month,

          wmr.submitted_by AS submitted_by_user_id,
          submitter.nick AS submitted_by_nick,

          wmr.corrected_by AS corrected_by_user_id,
          corrector.nick AS corrected_by_nick,

          replacement.reading_value
            AS replacement_reading_value,

          replacement.submitted_at
            AS replacement_submitted_at

        FROM water_meter_readings wmr

        JOIN water_meters wm
          ON wm.id = wmr.meter_id

        JOIN apartments a
          ON a.id = wm.apartment_id

        LEFT JOIN apartment_risers ar
          ON ar.id =
            wm.apartment_riser_id

        LEFT JOIN risers r
          ON r.id = ar.riser_id

        LEFT JOIN water_reporting_periods wrp
          ON wrp.id =
            wmr.reporting_period_id

        LEFT JOIN water_meter_readings replacement
          ON replacement.id =
            wmr.superseded_by_reading_id

        LEFT JOIN users submitter
          ON submitter.id =
            wmr.submitted_by

        LEFT JOIN users corrector
          ON corrector.id =
            wmr.corrected_by

        ORDER BY
          COALESCE(
            wmr.submitted_at,
            wmr.created_at,
            wmr.reading_date
          ) DESC,
          wmr.id DESC
      `)
        .all();

    // Stage 2I-2C2:
    // Water Reading History uses only pseudonymous user identity
    // from Main D1. No PII_DB read or decryption is performed here.
    return result.results || [];
  }
);

// =========================
// ADMIN APARTMENT RISERS
// =========================
Router.register(
  "GET",
  "/api/admin/apartment-risers",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const apartmentId =
      Number(
        ctx.url.searchParams.get(
          "apartment_id"
        )
      );

    if (
      !Number.isInteger(
        apartmentId
      ) ||
      apartmentId <= 0
    ) {
      return {
        error:
          "invalid_apartment_id"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          ar.id AS apartment_riser_id,
          ar.apartment_id,
          ar.local_label,

          r.id AS riser_id,
          r.code AS riser_code,
          r.system_type

        FROM apartment_risers ar

        JOIN risers r
          ON r.id = ar.riser_id

        WHERE ar.apartment_id = ?

        ORDER BY
          r.system_type ASC,
          r.code ASC,
          ar.local_label ASC
      `)
        .bind(
          apartmentId
        )
        .all();

    return result.results || [];
  }
);

// =========================
// ADMIN WATER METERS
// =========================
Router.register(
  "GET",
  "/api/admin/water-meters",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const result =
      await ctx.env.DB.prepare(`

        SELECT

          wm.id,

          wm.apartment_id,
          a.number AS apartment_number,

          wm.apartment_riser_id,

          r.code AS riser_code,
          ar.local_label,

          wm.type,
          wm.serial_number,
          wm.manufacturer,
          wm.model,

          wm.installed_at,

          (
            SELECT wmr.id
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.reporting_period_id IS NULL
              AND wmr.status = 'active'
            ORDER BY wmr.id DESC
            LIMIT 1
          ) AS initial_reading_id,

          (
            SELECT wmr.reading_value
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.reporting_period_id IS NULL
              AND wmr.status = 'active'
            ORDER BY wmr.id DESC
            LIMIT 1
          ) AS initial_reading,

          (
            SELECT wmr.reading_date
            FROM water_meter_readings wmr
            WHERE wmr.meter_id = wm.id
              AND wmr.reporting_period_id IS NULL
              AND wmr.status = 'active'
            ORDER BY wmr.id DESC
            LIMIT 1
          ) AS initial_reading_date,

          wm.active,

          wm.deactivated_at,
          wm.deactivation_reason,

          (
            SELECT wmc.id
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_id,

          (
            SELECT wmc.calibration_date
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_date,

          (
            SELECT wmc.validity_months
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_validity_months,

          (
            SELECT wmc.expires_at
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_expires_at,

          (
            SELECT wmc.certificate_file_name
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_document_name,

          (
            SELECT wmc.certificate_mime_type
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_document_mime_type,

          (
            SELECT wmc.certificate_size_bytes
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_document_size_bytes,

          (
            SELECT wmc.certificate_number
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_certificate_number,

          (
            SELECT wmc.calibration_laboratory
            FROM water_meter_calibrations wmc
            WHERE wmc.meter_id = wm.id
            ORDER BY
              wmc.calibration_date DESC,
              wmc.id DESC
            LIMIT 1
          ) AS calibration_laboratory,

          (
            SELECT reading_value
            FROM water_meter_readings
            WHERE meter_id = wm.id
              AND status = 'active'
            ORDER BY
              reading_date DESC,
              id DESC
            LIMIT 1
          ) AS last_reading,

          (
            SELECT reading_date
            FROM water_meter_readings
            WHERE meter_id = wm.id
              AND status = 'active'
            ORDER BY
              reading_date DESC,
              id DESC
            LIMIT 1
          ) AS last_reading_date

        FROM water_meters wm

        JOIN apartments a
          ON a.id = wm.apartment_id

        LEFT JOIN apartment_risers ar
          ON ar.id =
            wm.apartment_riser_id

        LEFT JOIN risers r
          ON r.id = ar.riser_id

        ORDER BY
          a.number ASC,
          wm.active DESC,
          wm.type ASC,
          r.code ASC,
          wm.id DESC

      `).all();

    return result.results;
  }
);


// =========================
// ADMIN WATER METER CALIBRATIONS
// =========================
Router.register(
  "GET",
  "/api/admin/water-meter-calibrations",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const meterId =
      Number(
        ctx.url.searchParams.get(
          "meter_id"
        )
      );

    if (
      !Number.isInteger(
        meterId
      ) ||
      meterId <= 0
    ) {
      return {
        error:
          "invalid_meter_id"
      };
    }

    const meter =
      await ctx.env.DB.prepare(`
        SELECT
          wm.id,
          wm.serial_number,
          wm.type,
          wm.manufacturer,
          wm.model,
          wm.apartment_id,
          a.number AS apartment_number

        FROM water_meters wm

        JOIN apartments a
          ON a.id = wm.apartment_id

        WHERE wm.id = ?
      `)
        .bind(
          meterId
        )
        .first();

    if (!meter) {
      return {
        error:
          "water_meter_not_found"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          meter_id,
          calibration_date,
          validity_months,
          expires_at,
          certificate_file_name,
          certificate_mime_type,
          certificate_size_bytes,
          certificate_number,
          calibration_laboratory,
          uploaded_by,
          created_at,
          notes

        FROM water_meter_calibrations

        WHERE meter_id = ?

        ORDER BY
          calibration_date DESC,
          id DESC
      `)
        .bind(
          meterId
        )
        .all();

    return {
      meter,
      calibrations:
        result.results || []
    };
  }
);

// =========================
// ADMIN GET WATER METER CERTIFICATE
// =========================
Router.register(
  "GET",
  "/api/admin/water-meter-certificate",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return new Response(
        JSON.stringify({
          error: "forbidden"
        }),
        {
          status: 403,
          headers: {
            "Content-Type":
              "application/json",
            ...ctx.cors,
          },
        }
      );
    }

    if (
      !hasWaterCertificateStorage(
        ctx.env
      )
    ) {
      return new Response(
        JSON.stringify({
          error:
            "water_certificate_storage_unavailable"
        }),
        {
          status: 503,
          headers: {
            "Content-Type":
              "application/json",
            ...ctx.cors,
          },
        }
      );
    }

    const calibrationId =
      Number(
        ctx.url.searchParams.get(
          "id"
        )
      );

    if (
      !Number.isInteger(
        calibrationId
      ) ||
      calibrationId <= 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            "invalid_calibration_id"
        }),
        {
          status: 400,
          headers: {
            "Content-Type":
              "application/json",
            ...ctx.cors,
          },
        }
      );
    }

    const calibration =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          meter_id,
          certificate_file_key,
          certificate_file_name,
          certificate_mime_type

        FROM water_meter_calibrations

        WHERE id = ?
      `)
        .bind(
          calibrationId
        )
        .first();

    if (
      !calibration ||
      !calibration
        .certificate_file_key
    ) {
      return new Response(
        JSON.stringify({
          error:
            "calibration_document_not_found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type":
              "application/json",
            ...ctx.cors,
          },
        }
      );
    }

    const object =
      await ctx.env
        .WATER_CERTIFICATES
        .get(
          calibration
            .certificate_file_key
        );

    if (!object) {
      return new Response(
        JSON.stringify({
          error:
            "calibration_document_object_not_found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type":
              "application/json",
            ...ctx.cors,
          },
        }
      );
    }

    const headers =
      new Headers();

    object.writeHttpMetadata(
      headers
    );

    headers.set(
      "Content-Type",
      calibration
        .certificate_mime_type ||
        headers.get(
          "Content-Type"
        ) ||
        "application/octet-stream"
    );

    const extension =
      getCertificateFileExtension(
        calibration
          .certificate_file_name
      );

    headers.set(
      "Content-Disposition",
      extension === ".pdf"
        ? `inline; filename="${calibration.certificate_file_name}"`
        : `attachment; filename="${calibration.certificate_file_name}"`
    );

    headers.set(
      "ETag",
      object.httpEtag
    );

    headers.set(
      "Cache-Control",
      "private, no-store"
    );

    headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );

    headers.set(
      "Referrer-Policy",
      "no-referrer"
    );

    headers.set(
      "X-Frame-Options",
      "DENY"
    );

    Object.entries(
      ctx.cors
    ).forEach(
      ([
        key,
        value,
      ]) => {

        headers.set(
          key,
          value
        );
      }
    );

    return new Response(
      object.body,
      {
        headers,
      }
    );
  }
);

// =========================
// CREATE WATER METER
// =========================
Router.register(
  "POST",
  "/api/admin/water-meters",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    if (
      !body.apartment_id ||
      !body.type
    ) {
      return {
        error: "missing_fields"
      };
    }

    const apartmentId =
      normalizePositiveInteger(
        body.apartment_id
      );

    const apartmentRiserId =
      body.apartment_riser_id
        ? Number(
            body.apartment_riser_id
          )
        : null;

    const initialReading =
      body.initial_reading ===
        null ||
      body.initial_reading ===
        undefined ||
      body.initial_reading ===
        ""
        ? null
        : Number(
            body.initial_reading
          );

    const initialReadingDate =
      String(
        body.initial_reading_date ||
        body.installed_at ||
        new Date()
          .toISOString()
          .slice(0, 10)
      ).trim();

    if (!apartmentId) {
      return {
        error:
          "invalid_apartment_id"
      };
    }

    const meterType =
      String(
        body.type || ""
      )
        .trim()
        .toLowerCase();

    if (
      !["cold", "hot"]
        .includes(meterType)
    ) {
      return {
        error:
          "invalid_water_meter_type"
      };
    }

    const serialNumber =
      normalizeBoundedText(
        body.serial_number,
        {
          maxLength: 128,
          fallback: "",
        }
      );

    const manufacturer =
      normalizeBoundedText(
        body.manufacturer,
        {
          maxLength: 128,
          fallback: "",
        }
      );

    const model =
      normalizeBoundedText(
        body.model,
        {
          maxLength: 128,
          fallback: "",
        }
      );

    const installedAt =
      normalizeBoundedText(
        body.installed_at,
        {
          maxLength: 10,
          fallback: "",
        }
      );

    if (
      serialNumber === null ||
      manufacturer === null ||
      model === null ||
      installedAt === null ||
      (
        installedAt &&
        !isValidIsoDate(
          installedAt
        )
      )
    ) {
      return {
        error:
          "invalid_water_meter_fields"
      };
    }

    const apartmentExists =
      await ctx.env.DB.prepare(`
        SELECT id
        FROM apartments
        WHERE id = ?
        LIMIT 1
      `)
        .bind(apartmentId)
        .first();

    if (!apartmentExists) {
      return {
        error:
          "apartment_not_found"
      };
    }

    if (
      apartmentRiserId !== null &&
      (
        !Number.isInteger(
          apartmentRiserId
        ) ||
        apartmentRiserId <= 0
      )
    ) {
      return {
        error:
          "invalid_apartment_riser_id"
      };
    }

    if (
      initialReading !== null &&
      (
        !Number.isInteger(
          initialReading
        ) ||
        initialReading < 0
      )
    ) {
      return {
        error:
          "invalid_initial_reading"
      };
    }

    if (
      initialReading !== null &&
      !isValidIsoDate(
        initialReadingDate
      )
    ) {
      return {
        error:
          "invalid_initial_reading_date"
      };
    }

    if (
      apartmentRiserId !== null
    ) {

      const validRiser =
        await ctx.env.DB.prepare(`
          SELECT id

          FROM apartment_risers

          WHERE id = ?
            AND apartment_id = ?
        `)
          .bind(
            apartmentRiserId,
            apartmentId
          )
          .first();

      if (!validRiser) {
        return {
          error:
            "apartment_riser_not_allowed"
        };
      }
    }

    const result =
      await ctx.env.DB.prepare(`

        INSERT INTO water_meters (

          apartment_id,
          apartment_riser_id,
          type,
          serial_number,
          manufacturer,
          model,
          installed_at,
          active

        )

        VALUES (

          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          1

        )

      `)
      .bind(
        apartmentId,
        apartmentRiserId,
        meterType,
        serialNumber || null,
        manufacturer || null,
        model || null,
        installedAt || null
      )
      .run();

    const meterId =
      result.meta.last_row_id;

    let initialReadingId =
      null;

    if (
      initialReading !== null
    ) {

      const readingResult =
        await ctx.env.DB.prepare(`
          INSERT INTO water_meter_readings (
            meter_id,
            reading_value,
            reading_date,
            submitted_by,
            status,
            reporting_period_id,
            submitted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            'active',
            NULL,
            ?
          )
        `)
          .bind(
            meterId,
            initialReading,
            initialReadingDate,
            admin.user_id,
            new Date()
              .toISOString()
          )
          .run();

      initialReadingId =
        readingResult.meta
          .last_row_id;
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.water_meter_create",
        targetType:
          "water_meter",
        targetId:
          String(meterId),
        details: {
          apartment_id:
            apartmentId,
          meter_type:
            meterType,
          initial_reading_created:
            initialReadingId !== null,
        },
      }
    );

    return {

      ok: true,

      meter_id:
        meterId,

      initial_reading_id:
        initialReadingId

    };
  }
);


// =========================
// UPDATE WATER METER
// =========================
Router.register(
  "POST",
  "/api/admin/update-water-meter",
  async (ctx) => {

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return { error: "forbidden" };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const meterId = Number(body.meter_id);
    const apartmentId = Number(body.apartment_id);
    const apartmentRiserId =
      body.apartment_riser_id
        ? Number(body.apartment_riser_id)
        : null;
    const type = String(body.type || "").trim().toLowerCase();
    const serialNumber = String(body.serial_number || "").trim();
    const installedAt = body.installed_at ? String(body.installed_at).trim() : null;
    const initialReading =
      body.initial_reading === null ||
      body.initial_reading === undefined ||
      body.initial_reading === ""
        ? null
        : Number(body.initial_reading);
    const initialReadingDate = body.initial_reading_date ? String(body.initial_reading_date).trim() : null;
    const correctionReason = String(body.correction_reason || "").trim();

    if (!Number.isInteger(meterId) || meterId <= 0) {
      return { error: "invalid_meter_id" };
    }
    if (!Number.isInteger(apartmentId) || apartmentId <= 0) {
      return { error: "invalid_apartment_id" };
    }
    if (!["cold", "hot"].includes(type)) {
      return { error: "invalid_water_meter_type" };
    }
    if (!serialNumber) {
      return { error: "serial_number_required" };
    }
    if (installedAt && !isValidIsoDate(installedAt)) {
      return { error: "invalid_installed_at" };
    }
    if (initialReading !== null && (!Number.isInteger(initialReading) || initialReading < 0)) {
      return { error: "invalid_initial_reading" };
    }
    if (initialReadingDate && !isValidIsoDate(initialReadingDate)) {
      return { error: "invalid_initial_reading_date" };
    }

    const meter = await ctx.env.DB.prepare(`
      SELECT id, apartment_id
      FROM water_meters
      WHERE id = ?
    `).bind(meterId).first();

    if (!meter) {
      return { error: "water_meter_not_found" };
    }

    if (apartmentRiserId !== null) {
      const riser = await ctx.env.DB.prepare(`
        SELECT id
        FROM apartment_risers
        WHERE id = ? AND apartment_id = ?
      `).bind(apartmentRiserId, apartmentId).first();
      if (!riser) {
        return { error: "apartment_riser_not_allowed" };
      }
    }

    const currentInitial = await ctx.env.DB.prepare(`
      SELECT id, reading_value, reading_date
      FROM water_meter_readings
      WHERE meter_id = ?
        AND reporting_period_id IS NULL
        AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `).bind(meterId).first();

    const normalizedInitialDate =
      initialReading === null
        ? null
        : initialReadingDate || currentInitial?.reading_date || installedAt || new Date().toISOString().slice(0, 10);

    const readingChanged =
      (currentInitial ? Number(currentInitial.reading_value) : null) !== initialReading ||
      (currentInitial?.reading_date || null) !== normalizedInitialDate;

    if (readingChanged && !correctionReason) {
      return { error: "correction_reason_required" };
    }

    await ctx.env.DB.prepare(`
      UPDATE water_meters
      SET apartment_id = ?, apartment_riser_id = ?, type = ?, serial_number = ?, manufacturer = ?, model = ?, installed_at = ?
      WHERE id = ?
    `).bind(
      apartmentId,
      apartmentRiserId,
      type,
      serialNumber,
      String(body.manufacturer || "").trim() || null,
      String(body.model || "").trim() || null,
      installedAt,
      meterId
    ).run();

    let newInitialReadingId = currentInitial?.id || null;

    if (readingChanged) {
      if (initialReading === null) {
        if (currentInitial) {
          await ctx.env.DB.prepare(`
            UPDATE water_meter_readings
            SET status = 'superseded', correction_reason = ?, corrected_by = ?, corrected_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
          `).bind(correctionReason, admin.user_id, currentInitial.id).run();
        }
        newInitialReadingId = null;
      } else {
        const inserted = await ctx.env.DB.prepare(`
          INSERT INTO water_meter_readings (
            meter_id, reading_value, reading_date, submitted_by, status, reporting_period_id, submitted_at, submission_source, source_note
          ) VALUES (?, ?, ?, ?, 'active', NULL, ?, 'admin_manual', ?)
        `).bind(
          meterId,
          initialReading,
          normalizedInitialDate,
          admin.user_id,
          new Date().toISOString(),
          correctionReason
        ).run();

        newInitialReadingId = inserted.meta.last_row_id;

        if (currentInitial) {
          await ctx.env.DB.prepare(`
            UPDATE water_meter_readings
            SET status = 'superseded', superseded_by_reading_id = ?, correction_reason = ?, corrected_by = ?, corrected_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
          `).bind(newInitialReadingId, correctionReason, admin.user_id, currentInitial.id).run();
        }
      }
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.water_meter_update",
        targetType:
          "water_meter",
        targetId:
          String(meterId),
        details: {
          apartment_id:
            apartmentId,
          meter_type:
            type,
          initial_reading_changed:
            readingChanged,
        },
      }
    );

    return {
      ok: true,
      meter_id: meterId,
      initial_reading_id: newInitialReadingId,
      initial_reading_changed: readingChanged,
    };
  }
);

// =========================
// DEACTIVATE WATER METER
// =========================
Router.register(
  "POST",
  "/api/admin/deactivate-water-meter",
  async (ctx) => {
    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

    const body =
      await ctx.request
        .json()
        .catch(() => ({}));

    const meterId =
      normalizePositiveInteger(
        body.meter_id
      );

    if (!meterId) {
      return {
        error:
          "invalid_meter_id"
      };
    }

    const reason =
      normalizeBoundedText(
        body.reason,
        {
          maxLength: 500,
          fallback: "other",
        }
      );

    if (reason === null) {
      return {
        error:
          "invalid_deactivation_reason"
      };
    }

    const meter =
      await ctx.env.DB.prepare(`
        SELECT
          id,
          active
        FROM water_meters
        WHERE id = ?
        LIMIT 1
      `)
        .bind(meterId)
        .first();

    if (!meter) {
      return {
        error:
          "water_meter_not_found"
      };
    }

    if (
      Number(meter.active) !== 1
    ) {
      return {
        error:
          "water_meter_already_inactive"
      };
    }

    const result =
      await ctx.env.DB.prepare(`
        UPDATE water_meters
        SET
          active = 0,
          deactivated_at =
            CURRENT_TIMESTAMP,
          deactivation_reason = ?
        WHERE id = ?
          AND active = 1
      `)
        .bind(
          reason || "other",
          meterId
        )
        .run();

    if (
      Number(
        result?.meta?.changes || 0
      ) !== 1
    ) {
      return {
        error:
          "water_meter_deactivation_failed"
      };
    }

    await SecurityAudit.recordSafe(
      ctx,
      {
        actorUserId:
          admin.user_id,
        action:
          "admin.water_meter_deactivate",
        targetType:
          "water_meter",
        targetId:
          String(meterId),
      }
    );

    return {
      ok: true
    };
  }
);

// =========================
// ADMIN DASHBOARD
// =========================
Router.register("GET", "/api/admin/dashboard", async (ctx) => {

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const apartments = await ctx.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM apartments
  `).first();

  const users = await ctx.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM users
  `).first();

  const meters = await ctx.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM water_meters
  `).first();

  const readings = await ctx.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM water_meter_readings
  `).first();

  const lastApartment = await ctx.env.DB.prepare(`
    SELECT id, number
    FROM apartments
    ORDER BY id DESC
    LIMIT 1
  `).first();

  const lastUser = await ctx.env.DB.prepare(`
    SELECT
      id,
      nick
    FROM users
    ORDER BY id DESC
    LIMIT 1
  `).first();

  const lastReading = await ctx.env.DB.prepare(`
    SELECT
      r.reading_value,
      r.reading_date,
      a.number AS apartment_number,
      m.serial_number,
      m.type
    FROM water_meter_readings r
    JOIN water_meters m
      ON m.id = r.meter_id
    JOIN apartments a
      ON a.id = m.apartment_id
    ORDER BY r.reading_date DESC
    LIMIT 1
  `).first();

  const recentReadings = await ctx.env.DB.prepare(`
    SELECT
      r.id,
      r.reading_value,
      r.reading_date,
      a.number AS apartment_number,
      m.serial_number,
      m.type
    FROM water_meter_readings r
    JOIN water_meters m
      ON m.id = r.meter_id
    JOIN apartments a
      ON a.id = m.apartment_id
    ORDER BY r.reading_date DESC
    LIMIT 10
  `).all();

  return {
    stats: {
      apartments: apartments.count,
      users: users.count,
      meters: meters.count,
      readings: readings.count
    },

    lastApartment,

    // Stage 2I-2D:
    // Admin Dashboard uses only pseudonymous user identity.
    // No PII_DB read or decryption is performed here.
    lastUser: lastUser
      ? {
          id: lastUser.id,
          nick:
            lastUser.nick || null,
        }
      : null,

    lastReading,

    recentReadings:
      recentReadings.results || []
  };
});

// =========================
// ADMIN CREATE USER
// =========================
Router.register("POST", "/api/admin/create-user", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  const nick =
    String(body.nick || "").trim();

  const firstName =
    String(body.first_name || "").trim();

  const lastName =
    String(body.last_name || "").trim();

  const email =
    PiiCrypto.normalizeEmail(
      body.email
    );

  const phone =
    String(body.phone || "").trim();

  const password =
    String(body.password || "");

  if (
    !nick ||
    !firstName ||
    !lastName ||
    !email ||
    !password
  ) {
    return {
      error:
        "missing_required_user_fields"
    };
  }

  if (password.length < 8) {
    return {
      error:
        "password_too_short"
    };
  }

  const existingNick =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM users
      WHERE nick = ? COLLATE NOCASE
      LIMIT 1
    `)
      .bind(nick)
      .first();

  if (existingNick) {
    return {
      error:
        "user_nick_exists"
    };
  }

  const existingEmailUserId =
    await PiiStore.findUserIdByEmail(
      email,
      ctx.env
    );

  if (existingEmailUserId) {
    return {
      error:
        "user_email_exists"
    };
  }

  const passwordHash =
    await hashPassword(
      password
    );

  const nowIso =
    new Date().toISOString();

  // Stage 2H-4C stable create for the final Main D1 schema.
  // personal_code remains NULL and email remains a technical placeholder.
  // Real PII is written exclusively to PII_DB.
  const technicalEmail =
    `mvx-user-${crypto.randomUUID()}@invalid.local`;

  const result =
    await ctx.env.DB.prepare(`
      INSERT INTO users (
        personal_code,
        email,
        password_hash,
        is_active,
        must_change_password,
        created_at,
        updated_at,
        nick
      )
      VALUES (NULL, ?, ?, 1, 1, ?, ?, ?)
    `)
      .bind(
        technicalEmail,
        passwordHash,
        nowIso,
        nowIso,
        nick
      )
      .run();

  const userId =
    Number(
      result.meta.last_row_id
    );

  try {
    await PiiStore.upsertUserPii(
      {
        userId,
        firstName,
        lastName,
        email,
        phone,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      ctx.env
    );
  } catch (error) {
    console.error(
      "PII write failed for /api/admin/create-user",
      {
        user_id: userId,
        error:
          String(
            error?.message ||
            error
          ),
      }
    );

    try {
      await ctx.env.DB.prepare(`
        DELETE FROM users
        WHERE id = ?
      `)
        .bind(userId)
        .run();
    } catch (cleanupError) {
      console.error(
        "Main D1 cleanup failed after PII create failure",
        {
          user_id: userId,
          error:
            String(
              cleanupError?.message ||
              cleanupError
            ),
        }
      );

      return {
        error:
          "user_create_consistency_error"
      };
    }

    return {
      error:
        "pii_write_failed"
    };
  }

  try {
    await PiiAudit.record(
      {
        actorUserId:
          admin.user_id,
        subjectUserId:
          userId,
        action:
          "create",
        endpoint:
          "/api/admin/create-user",
        fields: [
          "first_name",
          "last_name",
          "email",
          "phone",
        ],
        subjectCount:
          1,
      },
      ctx.env
    );
  } catch (error) {
    console.error(
      "PII audit write failed for /api/admin/create-user",
      {
        actor_user_id:
          admin.user_id,
        subject_user_id:
          userId,
        error:
          String(
            error?.message ||
            error
          ),
      }
    );
  }

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_create",
      targetType:
        "user",
      targetId:
        String(userId),
    }
  );

  return {
    ok: true,
    user_id: userId
  };
});

// =========================
// ADMIN UPDATE USER DATA
// =========================
Router.register("POST", "/api/admin/update-user", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  const userId =
    Number(body.id);

  const nick =
    String(body.nick || "").trim();

  const firstName =
    String(body.first_name || "").trim();

  const lastName =
    String(body.last_name || "").trim();

  const email =
    PiiCrypto.normalizeEmail(
      body.email
    );

  const phone =
    String(body.phone || "").trim();

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return {
      error:
        "invalid_user_id"
    };
  }

  if (
    !nick ||
    !firstName ||
    !lastName ||
    !email
  ) {
    return {
      error:
        "missing_required_user_fields"
    };
  }

  const user =
    await ctx.env.DB.prepare(`
      SELECT
        id,
        nick,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
      .bind(userId)
      .first();

  if (!user) {
    return {
      error:
        "user_not_found"
    };
  }

  const duplicateNick =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM users
      WHERE nick = ? COLLATE NOCASE
        AND id <> ?
      LIMIT 1
    `)
      .bind(
        nick,
        userId
      )
      .first();

  if (duplicateNick) {
    return {
      error:
        "user_nick_exists"
    };
  }

  const duplicateEmailUserId =
    await PiiStore.findUserIdByEmail(
      email,
      ctx.env
    );

  if (
    duplicateEmailUserId &&
    duplicateEmailUserId !== userId
  ) {
    return {
      error:
        "user_email_exists"
    };
  }

  const nowIso =
    new Date().toISOString();

  // Main D1 update contains account metadata only.
  // Real PII is updated exclusively in PII_DB.
  await ctx.env.DB.prepare(`
    UPDATE users
    SET
      nick = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      nick,
      nowIso,
      userId
    )
    .run();

  try {
    await PiiStore.upsertUserPii(
      {
        userId,
        firstName,
        lastName,
        email,
        phone,
        updatedAt: nowIso,
      },
      ctx.env
    );
  } catch (error) {
    console.error(
      "PII write failed for /api/admin/update-user",
      {
        user_id: userId,
        error:
          String(
            error?.message ||
            error
          ),
      }
    );

    try {
      await ctx.env.DB.prepare(`
        UPDATE users
        SET
          nick = ?,
          updated_at = ?
        WHERE id = ?
      `)
        .bind(
          user.nick,
          user.updated_at,
          userId
        )
        .run();
    } catch (rollbackError) {
      console.error(
        "Main D1 rollback failed after PII update failure",
        {
          user_id: userId,
          error:
            String(
              rollbackError?.message ||
              rollbackError
            ),
        }
      );

      return {
        error:
          "user_update_consistency_error"
      };
    }

    return {
      error:
        "pii_write_failed"
    };
  }

  try {
    await PiiAudit.record(
      {
        actorUserId:
          admin.user_id,
        subjectUserId:
          userId,
        action:
          "update",
        endpoint:
          "/api/admin/update-user",
        fields: [
          "first_name",
          "last_name",
          "email",
          "phone",
        ],
        subjectCount:
          1,
      },
      ctx.env
    );
  } catch (error) {
    console.error(
      "PII audit write failed for /api/admin/update-user",
      {
        actor_user_id:
          admin.user_id,
        subject_user_id:
          userId,
        error:
          String(
            error?.message ||
            error
          ),
      }
    );
  }

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_update",
      targetType:
        "user",
      targetId:
        String(userId),
    }
  );

  return {
    ok: true
  };
});

// =========================
// ADMIN SET USER STATUS
// =========================
Router.register("POST", "/api/admin/set-user-status", async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  const userId = Number(body.id);
  const status = Number(body.is_active);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: "invalid_user_id" };
  }

  if (![0, 1].includes(status)) {
    return { error: "invalid_user_status" };
  }

  if (
    userId === Number(admin.user_id) &&
    status === 0
  ) {
    return {
      error:
        "cannot_deactivate_self"
    };
  }

  const result = await ctx.env.DB.prepare(`
    UPDATE users
    SET
      is_active = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      status,
      new Date().toISOString(),
      userId
    )
    .run();

  if (!Number(result?.meta?.changes || 0)) {
    return { error: "user_not_found" };
  }

  if (status === 0) {
    await ctx.env.DB.prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
    `)
      .bind(
        new Date().toISOString(),
        userId
      )
      .run();
  }

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_status_set",
      targetType:
        "user",
      targetId:
        String(userId),
      details: {
        is_active:
          status,
        sessions_revoked:
          status === 0,
      },
    }
  );

  return {
    ok: true,
    user_id: userId,
    is_active: status
  };
});

// =========================
// ADMIN CREATE APARTMENT
// =========================
Router.register("POST", "/api/admin/create-apartment", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const normalized =
    normalizeApartmentPayload(
      body
    );

  if (!normalized.ok) {
    return {
      error: normalized.error
    };
  }

  const apartment =
    normalized.value;

  const duplicate =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM apartments
      WHERE number = ?
        COLLATE NOCASE
      LIMIT 1
    `)
      .bind(
        apartment.number
      )
      .first();

  if (duplicate) {
    return {
      error:
        "apartment_number_exists"
    };
  }

  const result =
    await ctx.env.DB.prepare(`
      INSERT INTO apartments (
        number,
        section,
        floor,
        room_count,
        residents_count,
        living_area,
        non_living_area,
        heated_area,
        alternative_heating_area,
        land_tax_area,
        alternative_heating,
        hot_water_riser_count,
        level_count,
        notes
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `)
      .bind(
        apartment.number,
        apartment.section,
        apartment.floor,
        apartment.room_count,
        apartment.residents_count,
        apartment.living_area,
        apartment.non_living_area,
        apartment.heated_area,
        apartment.alternative_heating_area,
        apartment.land_tax_area,
        apartment.alternative_heating,
        apartment.hot_water_riser_count,
        apartment.level_count,
        apartment.notes
      )
      .run();

  const apartmentId =
    Number(
      result.meta.last_row_id
    );

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.apartment_create",
      targetType:
        "apartment",
      targetId:
        String(apartmentId),
    }
  );

  return {
    ok: true,
    apartment_id:
      apartmentId
  };
});

// =========================
// ADMIN UPDATE APARTMENT
// =========================
Router.register("POST", "/api/admin/update-apartment", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const apartmentId =
    normalizePositiveInteger(
      body.id
    );

  if (!apartmentId) {
    return {
      error:
        "invalid_apartment_id"
    };
  }

  const normalized =
    normalizeApartmentPayload(
      body
    );

  if (!normalized.ok) {
    return {
      error: normalized.error
    };
  }

  const apartment =
    normalized.value;

  const existing =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM apartments
      WHERE id = ?
      LIMIT 1
    `)
      .bind(apartmentId)
      .first();

  if (!existing) {
    return {
      error:
        "apartment_not_found"
    };
  }

  const duplicate =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM apartments
      WHERE number = ?
        COLLATE NOCASE
        AND id <> ?
      LIMIT 1
    `)
      .bind(
        apartment.number,
        apartmentId
      )
      .first();

  if (duplicate) {
    return {
      error:
        "apartment_number_exists"
    };
  }

  await ctx.env.DB.prepare(`
    UPDATE apartments
    SET
      number = ?,
      section = ?,
      floor = ?,
      room_count = ?,
      residents_count = ?,
      living_area = ?,
      non_living_area = ?,
      heated_area = ?,
      alternative_heating_area = ?,
      land_tax_area = ?,
      alternative_heating = ?,
      hot_water_riser_count = ?,
      level_count = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      apartment.number,
      apartment.section,
      apartment.floor,
      apartment.room_count,
      apartment.residents_count,
      apartment.living_area,
      apartment.non_living_area,
      apartment.heated_area,
      apartment.alternative_heating_area,
      apartment.land_tax_area,
      apartment.alternative_heating,
      apartment.hot_water_riser_count,
      apartment.level_count,
      apartment.notes,
      new Date().toISOString(),
      apartmentId
    )
    .run();

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.apartment_update",
      targetType:
        "apartment",
      targetId:
        String(apartmentId),
    }
  );

  return {
    ok: true
  };
});

// =========================
// GET USER APARTMENTS
// =========================
Router.register("GET", "/api/admin/user-apartments", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const userId =
    normalizePositiveInteger(
      ctx.url.searchParams.get(
        "user_id"
      )
    );

  if (!userId) {
    return {
      error: "invalid_user_id"
    };
  }

  const user =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
      .bind(userId)
      .first();

  if (!user) {
    return {
      error: "user_not_found"
    };
  }

  const result =
    await ctx.env.DB.prepare(`
      SELECT
        ua.rowid AS id,
        ua.apartment_id,
        ua.relation_type,
        a.number,
        a.section,
        a.floor
      FROM user_apartments ua
      JOIN apartments a
        ON a.id =
          ua.apartment_id
      WHERE ua.user_id = ?
      ORDER BY a.number
    `)
      .bind(userId)
      .all();

  return result.results || [];
});

// =========================
// ADD USER APARTMENT
// =========================
Router.register("POST", "/api/admin/add-user-apartment", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const userId =
    normalizePositiveInteger(
      body.user_id
    );

  const apartmentId =
    normalizePositiveInteger(
      body.apartment_id
    );

  const relationType =
    String(
      body.relation_type || ""
    )
      .trim()
      .toLowerCase();

  if (!userId) {
    return {
      error: "invalid_user_id"
    };
  }

  if (!apartmentId) {
    return {
      error:
        "invalid_apartment_id"
    };
  }

  if (
    !USER_APARTMENT_RELATION_TYPES
      .has(relationType)
  ) {
    return {
      error:
        "invalid_relation_type"
    };
  }

  const user =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM users
      WHERE id = ?
      LIMIT 1
    `)
      .bind(userId)
      .first();

  if (!user) {
    return {
      error: "user_not_found"
    };
  }

  const apartment =
    await ctx.env.DB.prepare(`
      SELECT id
      FROM apartments
      WHERE id = ?
      LIMIT 1
    `)
      .bind(apartmentId)
      .first();

  if (!apartment) {
    return {
      error:
        "apartment_not_found"
    };
  }

  const existing =
    await ctx.env.DB.prepare(`
      SELECT rowid
      FROM user_apartments
      WHERE user_id = ?
        AND apartment_id = ?
        AND relation_type = ?
      LIMIT 1
    `)
      .bind(
        userId,
        apartmentId,
        relationType
      )
      .first();

  if (existing) {
    return {
      error: "assignment_exists"
    };
  }

  const result =
    await ctx.env.DB.prepare(`
      INSERT INTO user_apartments (
        user_id,
        apartment_id,
        relation_type
      )
      VALUES (?, ?, ?)
    `)
      .bind(
        userId,
        apartmentId,
        relationType
      )
      .run();

  const assignmentId =
    Number(
      result.meta.last_row_id
    );

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_apartment_add",
      targetType:
        "user_apartment",
      targetId:
        String(assignmentId),
      details: {
        user_id:
          userId,
        apartment_id:
          apartmentId,
        relation_type:
          relationType,
      },
    }
  );

  return {
    ok: true,
    assignment_id:
      assignmentId
  };
});

// =========================
// REMOVE USER APARTMENT
// =========================
Router.register("POST", "/api/admin/remove-user-apartment", async (ctx) => {
  const admin =
    await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden"
    };
  }

  const body =
    await ctx.request
      .json()
      .catch(() => ({}));

  const assignmentId =
    normalizePositiveInteger(
      body.assignment_id
    );

  if (!assignmentId) {
    return {
      error:
        "invalid_assignment_id"
    };
  }

  const existing =
    await ctx.env.DB.prepare(`
      SELECT rowid
      FROM user_apartments
      WHERE rowid = ?
      LIMIT 1
    `)
      .bind(assignmentId)
      .first();

  if (!existing) {
    return {
      error:
        "assignment_not_found"
    };
  }

  const result =
    await ctx.env.DB.prepare(`
      DELETE FROM user_apartments
      WHERE rowid = ?
    `)
      .bind(assignmentId)
      .run();

  if (
    Number(
      result?.meta?.changes || 0
    ) !== 1
  ) {
    return {
      error:
        "assignment_delete_failed"
    };
  }

  await SecurityAudit.recordSafe(
    ctx,
    {
      actorUserId:
        admin.user_id,
      action:
        "admin.user_apartment_remove",
      targetType:
        "user_apartment",
      targetId:
        String(assignmentId),
    }
  );

  return {
    ok: true
  };
});

// =========================
// JWT (WORKER SAFE)
// Stage 2I-SR2:
// HS256 access tokens with mandatory iat/exp.
// Existing pre-SR2 tokens without lifetime claims are intentionally rejected.
// Authorization roles are never trusted from the token; Auth.user()
// reloads current user status and roles from Main D1 on every request.
// =========================

const JWT_TTL_SECONDS =
  12 * 60 * 60;

const JWT_CLOCK_SKEW_SECONDS =
  60;

function jwtBase64UrlEncodeJson(
  value
) {
  const bytes =
    new TextEncoder().encode(
      JSON.stringify(value)
    );

  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary +=
      String.fromCharCode(
        bytes[index]
      );
  }

  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function jwtBase64UrlDecodeBytes(
  value
) {
  let normalized =
    String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    normalized.length % 4
  ) {
    normalized += "=";
  }

  const binary =
    atob(normalized);

  return Uint8Array.from(
    binary,
    (character) =>
      character.charCodeAt(0)
  );
}

function jwtBase64UrlDecodeJson(
  value
) {
  const bytes =
    jwtBase64UrlDecodeBytes(
      value
    );

  return JSON.parse(
    new TextDecoder().decode(
      bytes
    )
  );
}

async function signJWT(
  payload,
  secret
) {
  const normalizedSecret =
    String(secret || "");

  if (!normalizedSecret) {
    throw new Error(
      "missing_jwt_secret"
    );
  }

  const nowSeconds =
    Math.floor(
      Date.now() / 1000
    );

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const completePayload = {
    ...payload,
    iat:
      nowSeconds,
    exp:
      nowSeconds +
      JWT_TTL_SECONDS,
  };

  const h =
    jwtBase64UrlEncodeJson(
      header
    );

  const p =
    jwtBase64UrlEncodeJson(
      completePayload
    );

  const data =
    new TextEncoder().encode(
      `${h}.${p}`
    );

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        normalizedSecret
      ),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      [
        "sign",
      ]
    );

  const signature =
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        data
      )
    );

  let binarySignature = "";

  for (
    let index = 0;
    index <
    signature.length;
    index += 1
  ) {
    binarySignature +=
      String.fromCharCode(
        signature[index]
      );
  }

  const s =
    btoa(binarySignature)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  return `${h}.${p}.${s}`;
}

async function verifyJWT(
  token,
  secret
) {
  try {
    const normalizedSecret =
      String(secret || "");

    if (!normalizedSecret) {
      return null;
    }

    const parts =
      String(token || "")
        .split(".");

    if (
      parts.length !== 3
    ) {
      return null;
    }

    const [
      h,
      p,
      s,
    ] = parts;

    if (
      !h ||
      !p ||
      !s
    ) {
      return null;
    }

    const header =
      jwtBase64UrlDecodeJson(
        h
      );

    if (
      header?.alg !== "HS256" ||
      header?.typ !== "JWT"
    ) {
      return null;
    }

    const data =
      new TextEncoder().encode(
        `${h}.${p}`
      );

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(
          normalizedSecret
        ),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        [
          "verify",
        ]
      );

    const signature =
      jwtBase64UrlDecodeBytes(
        s
      );

    const valid =
      await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        data
      );

    if (!valid) {
      return null;
    }

    const payload =
      jwtBase64UrlDecodeJson(
        p
      );

    const userId =
      Number(
        payload?.user_id
      );

    const issuedAt =
      Number(
        payload?.iat
      );

    const expiresAt =
      Number(
        payload?.exp
      );

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(issuedAt) ||
      !Number.isInteger(expiresAt)
    ) {
      return null;
    }

    const nowSeconds =
      Math.floor(
        Date.now() / 1000
      );

    if (
      issuedAt >
        nowSeconds +
          JWT_CLOCK_SKEW_SECONDS
    ) {
      return null;
    }

    if (
      expiresAt <=
        nowSeconds -
          JWT_CLOCK_SKEW_SECONDS
    ) {
      return null;
    }

    if (
      expiresAt <= issuedAt ||
      expiresAt - issuedAt >
        JWT_TTL_SECONDS +
          JWT_CLOCK_SKEW_SECONDS
    ) {
      return null;
    }

    return {
      ...payload,
      user_id:
        userId,
      iat:
        issuedAt,
      exp:
        expiresAt,
    };

  } catch (error) {
    console.error(
      "JWT VERIFY ERROR:",
      error
    );

    return null;
  }
}

// =========================
// APARTMENTS FULL
// Stage 2I-5B6:
// Apartment list remains non-PII.
// Main D1 returns pseudonymous Nick together with user ID so
// Admin Apartments can search owners/residents by Nick without
// decrypting PII or querying PII_DB.
// =========================

Router.register("GET", "/api/apartments/full", async (ctx) => {

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return {
      error: "forbidden",
    };
  }

  const apartments = await ctx.env.DB.prepare(`
    SELECT *
    FROM apartments
    ORDER BY number
  `).all();

  const owners = await ctx.env.DB.prepare(`
    SELECT
      ua.apartment_id,
      ua.user_id AS id,
      u.nick
    FROM user_apartments ua
    JOIN users u
      ON u.id = ua.user_id
    WHERE ua.relation_type = 'owner'
  `).all();

  const residents = await ctx.env.DB.prepare(`
    SELECT
      ua.apartment_id,
      ua.user_id AS id,
      u.nick
    FROM user_apartments ua
    JOIN users u
      ON u.id = ua.user_id
    WHERE ua.relation_type = 'resident'
  `).all();

  const ownersMap = {};
  for (const owner of (owners.results || [])) {
    if (!ownersMap[owner.apartment_id]) {
      ownersMap[owner.apartment_id] = [];
    }

    ownersMap[owner.apartment_id].push({
      id: owner.id,
      nick: owner.nick || null,
    });
  }

  const residentsMap = {};
  for (const resident of (residents.results || [])) {
    if (!residentsMap[resident.apartment_id]) {
      residentsMap[resident.apartment_id] = [];
    }

    residentsMap[resident.apartment_id].push({
      id: resident.id,
      nick: resident.nick || null,
    });
  }

  return (apartments.results || []).map(
    (apartment) => ({
      ...apartment,
      owners:
        ownersMap[apartment.id] || [],
      residents:
        residentsMap[apartment.id] || [],
    })
  );

});

// =========================
// URGENT ANNOUNCEMENT PUSH DELIVERY
// =========================

function base64UrlToBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    "=".repeat(
      (
        4 -
        (
          normalized.length %
          4
        )
      ) % 4
    );

  const binary =
    atob(
      normalized +
      padding
    );

  return Uint8Array.from(
    binary,
    (character) =>
      character.charCodeAt(0)
  );
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary += String.fromCharCode(
      bytes[index]
    );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function concatBytes(...arrays) {
  const totalLength =
    arrays.reduce(
      (
        sum,
        array
      ) =>
        sum +
        array.length,
      0
    );

  const result =
    new Uint8Array(
      totalLength
    );

  let offset = 0;

  for (
    const array of arrays
  ) {
    result.set(
      array,
      offset
    );

    offset +=
      array.length;
  }

  return result;
}

function uint32BigEndian(value) {
  const bytes =
    new Uint8Array(4);

  new DataView(
    bytes.buffer
  ).setUint32(
    0,
    value,
    false
  );

  return bytes;
}

async function hmacSha256(
  keyBytes,
  dataBytes
) {
  const key =
    await crypto.subtle
      .importKey(
        "raw",
        keyBytes,
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        [
          "sign",
        ]
      );

  return new Uint8Array(
    await crypto.subtle
      .sign(
        "HMAC",
        key,
        dataBytes
      )
  );
}

async function hkdfExpand(
  pseudoRandomKey,
  info,
  length
) {
  const output =
    new Uint8Array(length);

  let previous =
    new Uint8Array(0);

  let generated = 0;
  let counter = 1;

  while (
    generated <
    length
  ) {
    const block =
      await hmacSha256(
        pseudoRandomKey,
        concatBytes(
          previous,
          info,
          new Uint8Array([
            counter,
          ])
        )
      );

    const remaining =
      length -
      generated;

    const copyLength =
      Math.min(
        block.length,
        remaining
      );

    output.set(
      block.slice(
        0,
        copyLength
      ),
      generated
    );

    previous = block;
    generated +=
      copyLength;
    counter += 1;
  }

  return output;
}

async function hkdf(
  salt,
  inputKeyMaterial,
  info,
  length
) {
  const pseudoRandomKey =
    await hmacSha256(
      salt,
      inputKeyMaterial
    );

  return await hkdfExpand(
    pseudoRandomKey,
    info,
    length
  );
}

async function createVapidJwt(
  endpoint,
  env
) {
  const publicKeyBytes =
    base64UrlToBytes(
      env.VAPID_PUBLIC_KEY
    );

  const privateKeyBytes =
    base64UrlToBytes(
      env.VAPID_PRIVATE_KEY
    );

  if (
    publicKeyBytes.length !==
      65 ||
    publicKeyBytes[0] !==
      4 ||
    privateKeyBytes.length !==
      32
  ) {
    throw new Error(
      "invalid_vapid_keys"
    );
  }

  const x =
    publicKeyBytes.slice(
      1,
      33
    );

  const y =
    publicKeyBytes.slice(
      33,
      65
    );

  const privateKey =
    await crypto.subtle
      .importKey(
        "jwk",
        {
          kty: "EC",
          crv: "P-256",
          x:
            bytesToBase64Url(
              x
            ),
          y:
            bytesToBase64Url(
              y
            ),
          d:
            bytesToBase64Url(
              privateKeyBytes
            ),
          ext: true,
        },
        {
          name: "ECDSA",
          namedCurve:
            "P-256",
        },
        false,
        [
          "sign",
        ]
      );

  const endpointUrl =
    new URL(endpoint);

  const nowSeconds =
    Math.floor(
      Date.now() /
      1000
    );

  const header =
    bytesToBase64Url(
      new TextEncoder()
        .encode(
          JSON.stringify({
            typ: "JWT",
            alg: "ES256",
          })
        )
    );

  const payload =
    bytesToBase64Url(
      new TextEncoder()
        .encode(
          JSON.stringify({
            aud:
              endpointUrl.origin,
            exp:
              nowSeconds +
              12 * 60 * 60,
            sub:
              String(
                env.VAPID_SUBJECT ||
                "mailto:admin@example.com"
              ),
          })
        )
    );

  const unsignedToken =
    `${header}.${payload}`;

  const signature =
    new Uint8Array(
      await crypto.subtle
        .sign(
          {
            name: "ECDSA",
            hash: "SHA-256",
          },
          privateKey,
          new TextEncoder()
            .encode(
              unsignedToken
            )
        )
    );

  return {
    token:
      `${unsignedToken}.${bytesToBase64Url(
        signature
      )}`,

    publicKey:
      env.VAPID_PUBLIC_KEY,
  };
}

async function encryptWebPushPayload(
  subscription,
  payloadObject
) {
  const userPublicKey =
    base64UrlToBytes(
      subscription.p256dh
    );

  const authSecret =
    base64UrlToBytes(
      subscription.auth
    );

  const userKey =
    await crypto.subtle
      .importKey(
        "raw",
        userPublicKey,
        {
          name: "ECDH",
          namedCurve:
            "P-256",
        },
        false,
        []
      );

  const serverKeyPair =
    await crypto.subtle
      .generateKey(
        {
          name: "ECDH",
          namedCurve:
            "P-256",
        },
        true,
        [
          "deriveBits",
        ]
      );

  const serverPublicKey =
    new Uint8Array(
      await crypto.subtle
        .exportKey(
          "raw",
          serverKeyPair
            .publicKey
        )
    );

  const sharedSecret =
    new Uint8Array(
      await crypto.subtle
        .deriveBits(
          {
            name: "ECDH",
            public:
              userKey,
          },
          serverKeyPair
            .privateKey,
          256
        )
    );

  const encoder =
    new TextEncoder();

  const keyInfo =
    concatBytes(
      encoder.encode(
        "WebPush: info"
      ),
      new Uint8Array([
        0,
      ]),
      userPublicKey,
      serverPublicKey
    );

  const inputKeyMaterial =
    await hkdf(
      authSecret,
      sharedSecret,
      keyInfo,
      32
    );

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const contentEncryptionKey =
    await hkdf(
      salt,
      inputKeyMaterial,
      encoder.encode(
        "Content-Encoding: aes128gcm\0"
      ),
      16
    );

  const nonce =
    await hkdf(
      salt,
      inputKeyMaterial,
      encoder.encode(
        "Content-Encoding: nonce\0"
      ),
      12
    );

  const aesKey =
    await crypto.subtle
      .importKey(
        "raw",
        contentEncryptionKey,
        {
          name: "AES-GCM",
        },
        false,
        [
          "encrypt",
        ]
      );

  const payloadBytes =
    encoder.encode(
      JSON.stringify(
        payloadObject
      )
    );

  const recordPlaintext =
    concatBytes(
      payloadBytes,
      new Uint8Array([
        2,
      ])
    );

  const ciphertext =
    new Uint8Array(
      await crypto.subtle
        .encrypt(
          {
            name: "AES-GCM",
            iv: nonce,
            tagLength: 128,
          },
          aesKey,
          recordPlaintext
        )
    );

  const recordSize =
    4096;

  return concatBytes(
    salt,
    uint32BigEndian(
      recordSize
    ),
    new Uint8Array([
      serverPublicKey.length,
    ]),
    serverPublicKey,
    ciphertext
  );
}

async function ensurePushDeliveriesTable(
  env
) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS push_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      subscription_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempted_at TEXT,
      sent_at TEXT,
      response_status INTEGER,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(
        announcement_id,
        subscription_id
      ),
      FOREIGN KEY (announcement_id)
        REFERENCES announcements(id),
      FOREIGN KEY (subscription_id)
        REFERENCES push_subscriptions(id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_push_deliveries_announcement
    ON push_deliveries(
      announcement_id,
      status
    )
  `).run();
}

function getPushRecipientSql() {
  return `
    EXISTS (
      SELECT 1
      FROM announcement_targets target
      WHERE target.announcement_id = ?
        AND (
          target.target_type = 'all'

          OR (
            target.target_type = 'user'
            AND CAST(
              target.target_value
              AS INTEGER
            ) =
              ps.user_id
          )

          OR (
            target.target_type = 'role'
            AND EXISTS (
              SELECT 1
              FROM user_roles ur
              JOIN roles r
                ON r.id =
                  ur.role_id
              WHERE ur.user_id =
                ps.user_id
                AND r.name =
                  target.target_value
            )
          )

          OR (
            target.target_type = 'apartment'
            AND EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id =
                ps.user_id
                AND ua.apartment_id =
                  CAST(
                    target.target_value
                    AS INTEGER
                  )
            )
          )

          OR (
            target.target_type = 'section'
            AND EXISTS (
              SELECT 1
              FROM user_apartments ua
              JOIN apartments apartment
                ON apartment.id =
                  ua.apartment_id
              WHERE ua.user_id =
                ps.user_id
                AND CAST(
                  apartment.section
                  AS TEXT
                ) =
                  target.target_value
            )
          )
        )
    )
  `;
}

function getUrgentPushText(
  announcement,
  language
) {
  const normalizedLanguage =
    String(
      language || "en"
    )
      .trim()
      .toLowerCase();

  const titleMap = {
    en:
      "Urgent MVX announcement",
    lv:
      "Steidzams MVX paziņojums",
    ru:
      "Срочное объявление MVX",
  };

  const fallbackTitle =
    titleMap[
      normalizedLanguage
    ] ||
    titleMap.en;

  return {
    title:
      String(
        announcement.title ||
        fallbackTitle
      ).slice(
        0,
        120
      ),

    body:
      String(
        announcement.content ||
        ""
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim()
        .slice(
          0,
          220
        ),
  };
}

async function sendPushToSubscription(
  env,
  subscription,
  payload
) {
  const endpointValidation =
    validatePushEndpoint(
      subscription?.endpoint
    );

  if (!endpointValidation.ok) {
    throw new Error(
      endpointValidation.error
    );
  }

  const safeEndpoint =
    endpointValidation.endpoint;

  const encryptedBody =
    await encryptWebPushPayload(
      subscription,
      payload
    );

  const vapid =
    await createVapidJwt(
      safeEndpoint,
      env
    );

  return await fetch(
    safeEndpoint,
    {
      method: "POST",

      headers: {
        "Content-Encoding":
          "aes128gcm",

        "Content-Type":
          "application/octet-stream",

        TTL: "86400",

        Urgency: "high",

        Authorization:
          `vapid t=${vapid.token}, k=${vapid.publicKey}`,
      },

      body:
        encryptedBody,
    }
  );
}

async function sendUrgentAnnouncementPushes(
  env,
  announcementId
) {
  if (
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY
  ) {
    console.warn(
      "Push delivery skipped: VAPID is not configured."
    );

    return {
      ok: false,
      skipped: true,
      reason:
        "push_not_configured",
    };
  }

  await ensurePushSubscriptionsTable(
    env
  );

  await ensurePushDeliveriesTable(
    env
  );

  const announcement =
    await getAnnouncementById(
      env,
      announcementId
    );

  if (
    !announcement ||
    announcement.status !==
      "published" ||
    announcement.priority !==
      "important"
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "not_urgent_published",
    };
  }

  const nowIso =
    new Date().toISOString();

  if (
    announcement.publish_from &&
    new Date(
      announcement.publish_from
    ) >
      new Date(nowIso)
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "publish_not_started",
    };
  }

  if (
    announcement.publish_until &&
    new Date(
      announcement.publish_until
    ) <
      new Date(nowIso)
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "publish_expired",
    };
  }

  const subscriptionsResult =
    await env.DB.prepare(`
      SELECT
        ps.id,
        ps.user_id,
        ps.endpoint,
        ps.p256dh,
        ps.auth,
        ps.language
      FROM push_subscriptions ps
      WHERE ps.is_active = 1
        AND ${getPushRecipientSql()}
      ORDER BY ps.id
    `)
      .bind(
        announcementId
      )
      .all();

  const subscriptions =
    subscriptionsResult
      .results || [];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (
    const subscription of
    subscriptions
  ) {
    const createdAt =
      new Date()
        .toISOString();

    const claim =
      await env.DB.prepare(`
        INSERT OR IGNORE INTO push_deliveries (
          announcement_id,
          subscription_id,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, 'pending', ?, ?
        )
      `)
        .bind(
          announcementId,
          subscription.id,
          createdAt,
          createdAt
        )
        .run();

    if (
      Number(
        claim?.meta?.changes ||
        0
      ) === 0
    ) {
      skipped += 1;
      continue;
    }

    const localizedText =
      getUrgentPushText(
        announcement,
        subscription.language
      );

    const payload = {
      title:
        localizedText.title,

      body:
        localizedText.body,

      url:
        `/announcements?id=${announcementId}`,

      tag:
        `mvx-urgent-announcement-${announcementId}`,

      announcement_id:
        announcementId,
    };

    const attemptedAt =
      new Date()
        .toISOString();

    try {
      const response =
        await sendPushToSubscription(
          env,
          subscription,
          payload
        );

      const responseStatus =
        Number(
          response.status
        );

      if (response.ok) {
        sent += 1;

        await env.DB.prepare(`
          UPDATE push_deliveries
          SET
            status = 'sent',
            attempted_at = ?,
            sent_at = ?,
            response_status = ?,
            error = NULL,
            updated_at = ?
          WHERE announcement_id = ?
            AND subscription_id = ?
        `)
          .bind(
            attemptedAt,
            attemptedAt,
            responseStatus,
            attemptedAt,
            announcementId,
            subscription.id
          )
          .run();

        await env.DB.prepare(`
          UPDATE push_subscriptions
          SET
            last_success_at = ?,
            last_error_at = NULL,
            updated_at = ?
          WHERE id = ?
        `)
          .bind(
            attemptedAt,
            attemptedAt,
            subscription.id
          )
          .run();

      } else {
        failed += 1;

        try {
          await response.body?.cancel?.();
        } catch {
          // Ignore response-body cleanup failures.
        }

        await env.DB.prepare(`
          UPDATE push_deliveries
          SET
            status = 'failed',
            attempted_at = ?,
            response_status = ?,
            error = ?,
            updated_at = ?
          WHERE announcement_id = ?
            AND subscription_id = ?
        `)
          .bind(
            attemptedAt,
            responseStatus,
            `HTTP ${responseStatus}`,
            attemptedAt,
            announcementId,
            subscription.id
          )
          .run();

        await env.DB.prepare(`
          UPDATE push_subscriptions
          SET
            is_active =
              CASE
                WHEN ? IN (
                  404,
                  410
                )
                  THEN 0
                ELSE is_active
              END,
            last_error_at = ?,
            updated_at = ?
          WHERE id = ?
        `)
          .bind(
            responseStatus,
            attemptedAt,
            attemptedAt,
            subscription.id
          )
          .run();
      }

    } catch (error) {
      failed += 1;

      const errorCode =
        String(
          error?.name ||
          "push_delivery_error"
        )
          .slice(
            0,
            120
          );

      App.logError(
        "push_delivery_error",
        error,
        {
          subscription_id:
            Number(
              subscription.id
            ),
          announcement_id:
            Number(
              announcementId
            ),
        }
      );

      await env.DB.prepare(`
        UPDATE push_deliveries
        SET
          status = 'failed',
          attempted_at = ?,
          error = ?,
          updated_at = ?
        WHERE announcement_id = ?
          AND subscription_id = ?
      `)
        .bind(
          attemptedAt,
          errorCode,
          attemptedAt,
          announcementId,
          subscription.id
        )
        .run();

      await env.DB.prepare(`
        UPDATE push_subscriptions
        SET
          last_error_at = ?,
          updated_at = ?
        WHERE id = ?
      `)
        .bind(
          attemptedAt,
          attemptedAt,
          subscription.id
        )
        .run();
    }
  }

  return {
    ok: true,
    recipients:
      subscriptions.length,
    sent,
    failed,
    skipped,
  };
}

// =========================
// PUSH ENDPOINT VALIDATION
// Stage 2I-SR9:
// outbound push requests are restricted to known Web Push providers.
// =========================
const PUSH_ENDPOINT_ALLOWED_HOSTS =
  new Set([
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "push.services.mozilla.com",
    "web.push.apple.com",
  ]);

function isAllowedPushEndpointHost(
  hostname
) {
  const normalized =
    String(hostname || "")
      .trim()
      .toLowerCase();

  if (
    PUSH_ENDPOINT_ALLOWED_HOSTS
      .has(normalized)
  ) {
    return true;
  }

  return normalized.endsWith(
    ".push.apple.com"
  );
}

function validatePushEndpoint(
  value
) {
  const raw =
    String(value || "")
      .trim();

  if (
    !raw ||
    raw.length > 4096
  ) {
    return {
      ok: false,
      error:
        "invalid_push_endpoint",
    };
  }

  let url;

  try {
    url =
      new URL(raw);
  } catch {
    return {
      ok: false,
      error:
        "invalid_push_endpoint",
    };
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    !isAllowedPushEndpointHost(
      url.hostname
    )
  ) {
    return {
      ok: false,
      error:
        "push_endpoint_not_allowed",
    };
  }

  return {
    ok: true,
    endpoint:
      url.toString(),
  };
}

// =========================
// PUSH SUBSCRIPTIONS
// =========================
async function ensurePushSubscriptionsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      language TEXT,
      device_label TEXT,
      user_agent TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_success_at TEXT,
      last_error_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
    ON push_subscriptions(user_id, is_active)
  `).run();
}

Router.register(
  "GET",
  "/api/push/config",
  async (ctx) => {
    const user = await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized",
      };
    }

    const publicKey = String(
      ctx.env.VAPID_PUBLIC_KEY || ""
    ).trim();

    if (!publicKey) {
      return {
        ok: false,
        configured: false,
        error: "push_not_configured",
      };
    }

    return {
      ok: true,
      configured: true,
      vapid_public_key: publicKey,
    };
  }
);

Router.register(
  "GET",
  "/api/push/status",
  async (ctx) => {
    const user = await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized",
      };
    }

    await ensurePushSubscriptionsTable(
      ctx.env
    );

    const result = await ctx.env.DB
      .prepare(`
        SELECT
          COUNT(*) AS active_subscriptions
        FROM push_subscriptions
        WHERE user_id = ?
          AND is_active = 1
      `)
      .bind(user.user_id)
      .first();

    const activeSubscriptions = Number(
      result?.active_subscriptions || 0
    );

    return {
      ok: true,
      subscribed:
        activeSubscriptions > 0,
      active_subscriptions:
        activeSubscriptions,
    };
  }
);

Router.register(
  "POST",
  "/api/push/subscribe",
  async (ctx) => {
    const user = await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized",
      };
    }

    const body = await ctx.request
      .json()
      .catch(() => ({}));

    const subscription =
      body?.subscription || body;

    const endpointValidation =
      validatePushEndpoint(
        subscription?.endpoint
      );

    if (
      !endpointValidation.ok
    ) {
      return {
        error:
          endpointValidation.error,
      };
    }

    const endpoint =
      endpointValidation.endpoint;

    const p256dh = String(
      subscription?.keys?.p256dh ||
      body?.p256dh ||
      ""
    ).trim();

    const auth = String(
      subscription?.keys?.auth ||
      body?.auth ||
      ""
    ).trim();

    if (!p256dh || !auth) {
      return {
        error: "push_keys_required",
      };
    }

    if (
      p256dh.length > 512 ||
      auth.length > 512
    ) {
      return {
        error: "push_subscription_too_large",
      };
    }

    await ensurePushSubscriptionsTable(
      ctx.env
    );

    const now = new Date().toISOString();

    const language = String(
      body?.language || ""
    )
      .trim()
      .slice(0, 16) || null;

    const deviceLabel = String(
      body?.device_label || ""
    )
      .trim()
      .slice(0, 120) || null;

    const userAgent = String(
      body?.user_agent ||
      ctx.request.headers.get(
        "User-Agent"
      ) ||
      ""
    )
      .trim()
      .slice(0, 500) || null;

    await ctx.env.DB.prepare(`
      INSERT INTO push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth,
        language,
        device_label,
        user_agent,
        is_active,
        created_at,
        updated_at,
        last_error_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)
      ON CONFLICT(endpoint)
      DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        language = excluded.language,
        device_label = excluded.device_label,
        user_agent = excluded.user_agent,
        is_active = 1,
        updated_at = excluded.updated_at,
        last_error_at = NULL
    `)
      .bind(
        user.user_id,
        endpoint,
        p256dh,
        auth,
        language,
        deviceLabel,
        userAgent,
        now,
        now
      )
      .run();

    return {
      ok: true,
      subscribed: true,
    };
  }
);

Router.register(
  "POST",
  "/api/push/unsubscribe",
  async (ctx) => {
    const user = await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized",
      };
    }

    const body = await ctx.request
      .json()
      .catch(() => ({}));

    const endpointValidation =
      validatePushEndpoint(
        body?.endpoint
      );

    if (
      !endpointValidation.ok
    ) {
      return {
        error:
          endpointValidation.error,
      };
    }

    const endpoint =
      endpointValidation.endpoint;

    await ensurePushSubscriptionsTable(
      ctx.env
    );

    const result = await ctx.env.DB
      .prepare(`
        UPDATE push_subscriptions
        SET
          is_active = 0,
          updated_at = ?
        WHERE user_id = ?
          AND endpoint = ?
      `)
      .bind(
        new Date().toISOString(),
        user.user_id,
        endpoint
      )
      .run();

    return {
      ok: true,
      subscribed: false,
      changed:
        Number(
          result?.meta?.changes || 0
        ),
    };
  }
);
