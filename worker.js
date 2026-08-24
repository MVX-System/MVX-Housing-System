export default {
  async fetch(request, env, ctx) {
    return await App.handle(request, env);
  }
};

// =========================
// APP CORE
// =========================
class App {
static async handle(request, env) {
  const url = new URL(request.url);
  const cors = this.cors();

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

      // 🔥 FIX: если handler вернул Response — НЕ оборачиваем
      if (result instanceof Response) return result;

      return this.json(result, 200, cors);

    } catch (e) {
      console.error("ROUTE ERROR:", url.pathname, e, e?.message, e?.stack);

      return this.json(
        {
          error: "route_error",
          path: url.pathname,
          message: String(e?.message || e),
        },
        500,
        cors
      );
    }

  } catch (e) {
    console.error("FATAL ERROR:", e);

    return this.json(
      {
        error: "internal_error",
        message: String(e?.message || e),
      },
      500,
      cors
    );
  }
}

  // =========================
  // RESPONSE
  // =========================
  static json(data, status, cors) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...cors,
      },
    });
  }

  static cors() {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
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
// =========================
const Auth = {
  async user(ctx) {
    const auth = ctx.request.headers.get("Authorization");
    if (!auth) return null;

    const token = auth.replace("Bearer ", "");
    return await verifyJWT(token, ctx.env.JWT_SECRET);
  },

  async requireUser(ctx) {
    const u = await Auth.user(ctx);
    return u || null;
  },

  async requireAdmin(ctx) {
    const u = await Auth.user(ctx);
    if (!u) return null;
    if (!u.roles?.includes("admin")) return null;
    return u;
  },
};

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
    LIMIT 1
  `)
    .bind(nickInput)
    .first();
}

// =========================
// SERVICES
// =========================
const Service = {
  async login(env, body) {
    const user =
      await findUserForLogin(env, body);

    if (!user) return null;

    const hash = await hashPassword(String(body.password || ""));
    if (hash !== user.password_hash) return null;

    const rolesRes = await env.DB.prepare(`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).bind(user.id).all();

    const roles = rolesRes.results.map(r => r.name);

    const token = await signJWT(
      {
        user_id: user.id,
        nick: user.nick || null,
        roles,
      },
      env.JWT_SECRET
    );

    return token;
  }
};

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

    const currentPasswordHash =
      await hashPassword(
        currentPassword
      );

    if (
      String(
        currentPasswordHash
      ) !==
      String(
        user.password_hash || ""
      )
    ) {
      return {
        error:
          "current_password_incorrect"
      };
    }

    const newPasswordHash =
      await hashPassword(
        newPassword
      );

    if (
      String(
        newPasswordHash
      ) ===
      String(
        user.password_hash || ""
      )
    ) {
      return {
        error:
          "new_password_same_as_current"
      };
    }

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

    return {
      ok: true,
      must_change_password: 0
    };
  }
);

// LOGIN
// Stage 2E-3: Nick-only login.
Router.register("POST", "/api/login", async (ctx) => {
  try {
    const body = await ctx.request.json().catch(() => ({}));

    const nickInput =
      String(body?.nick || "").trim();

    if (!nickInput || !body?.password) {
      return { error: "missing_fields" };
    }

    const user =
      await findUserForLogin(ctx.env, body);

    if (!user) {
      return { error: "invalid_credentials" };
    }

    const hash = await hashPassword(String(body.password || ""));

    if (String(hash) !== String(user.password_hash || "")) {
      return { error: "invalid_credentials" };
    }

    const rolesResult = await ctx.env.DB.prepare(`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).bind(user.id).all();

    const roles = rolesResult.results.map(r => r.name);

    const token = await signJWT(
      {
        user_id: user.id,
        nick: user.nick || null,
        roles,
      },
      ctx.env.JWT_SECRET
    );

    return { token };

  } catch (e) {
    return {
      error: "login_crash",
      message: String(e?.message || e),
    };
  }
});

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
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return { error: "forbidden" };

  const body = await ctx.request.json().catch(() => ({}));

  await ctx.env.DB.prepare(
    "DELETE FROM user_roles WHERE user_id=?"
  ).bind(body.user_id).run();

  for (const roleId of body.roles || []) {
    await ctx.env.DB.prepare(
      "INSERT INTO user_roles(user_id,role_id) VALUES(?,?)"
    ).bind(body.user_id, roleId).run();
  }

  return { ok: true };
});

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
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

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const user =
      await Auth.requireUser(ctx);

    if (!user) {
      return {
        error: "unauthorized"
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

  await syncWaterReportingPeriodStatuses(
    ctx.env
  );

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

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

  await syncWaterReportingPeriodStatuses(
    ctx.env
  );

  const u = await Auth.requireUser(ctx);

  if (!u) {
    return { error: "unauthorized" };
  }

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
    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
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
    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

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

    return {
      ok: true,
      reading_id:
        result.meta.last_row_id,
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

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
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

    await syncWaterReportingPeriodStatuses(
      ctx.env
    );

    const admin =
      await Auth.requireAdmin(ctx);

    if (!admin) {
      return {
        error: "forbidden"
      };
    }

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
      Number(
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
        body.type,
        body.serial_number || null,
        String(
          body.manufacturer || ""
        ).trim() || null,
        String(
          body.model || ""
        ).trim() || null,
        body.installed_at || null
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

    if (!body.meter_id) {

      return {
        error:
          "missing_meter_id"
      };

    }

    await ctx.env.DB.prepare(`

      UPDATE water_meters

      SET

        active = 0,

        deactivated_at =
          CURRENT_TIMESTAMP,

        deactivation_reason = ?

      WHERE id = ?

    `)
    .bind(
      body.reason || "other",
      body.meter_id
    )
    .run();

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

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  if (!body.number) {
    return {
      error: "missing_number"
    };
  }

  const result = await ctx.env.DB.prepare(`
    INSERT INTO apartments (
      number,
      section,
      floor,
      room_count,
      resident_count,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      body.number,
      body.section || "",
      body.floor || 0,

      body.room_count || 1,
      body.resident_count || 0,

      body.living_area || 0,
      body.non_living_area || 0,
      body.heated_area || 0,

      body.alternative_heating_area || 0,
      body.land_tax_area || 0,

      body.alternative_heating ? 1 : 0,

      body.hot_water_riser_count || 0,

      body.level_count || 1,

      body.notes || ""
    )
    .run();

  return {
    ok: true,
    apartment_id: result.meta.last_row_id
  };
});

// =========================
// ADMIN UPDATE APARTMENT
// =========================
Router.register("POST", "/api/admin/update-apartment", async (ctx) => {

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  if (!body.id) {
    return {
      error: "missing_apartment_id"
    };
  }

  await ctx.env.DB.prepare(`
    UPDATE apartments
    SET
      number = ?,
      section = ?,
      floor = ?,

      room_count = ?,
      resident_count = ?,

      living_area = ?,
      non_living_area = ?,
      heated_area = ?,

      alternative_heating_area = ?,
      land_tax_area = ?,

      alternative_heating = ?,

      hot_water_riser_count = ?,

      level_count = ?,
      notes = ?
    WHERE id = ?
  `)
    .bind(
      body.number,
      body.section,
      body.floor,

      body.room_count,
      body.resident_count,

      body.living_area,
      body.non_living_area,
      body.heated_area,

      body.alternative_heating_area,
      body.land_tax_area,

      body.alternative_heating ? 1 : 0,

      body.hot_water_riser_count,

      body.level_count,
      body.notes,

      body.id
    )
    .run();

  return {
    ok: true
  };
});

// =========================
// GET USER APARTMENTS
// =========================
Router.register("GET", "/api/admin/user-apartments", async (ctx) => {

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const userId = ctx.url.searchParams.get("user_id");

  if (!userId) {
    return {
      error: "missing_user_id"
    };
  }

  const result = await ctx.env.DB.prepare(`
    SELECT
      ua.rowid as id,
      ua.apartment_id,
      ua.relation_type,

      a.number,
      a.section,
      a.floor

    FROM user_apartments ua

    JOIN apartments a
      ON a.id = ua.apartment_id

    WHERE ua.user_id = ?

    ORDER BY a.number
  `)
    .bind(userId)
    .all();

  return result.results;
});

// =========================
// ADD USER APARTMENT
// =========================
Router.register("POST", "/api/admin/add-user-apartment", async (ctx) => {

  try {

    const admin = await Auth.requireAdmin(ctx);

    if (!admin) {
      return { error: "forbidden" };
    }

    const body = await ctx.request.json().catch(() => ({}));
if (
      !body.user_id ||
      !body.apartment_id ||
      !body.relation_type
    ) {
      return {
        error: "missing_fields",
        body
      };
    }

    // normalize ids
    const userId =
      Number(body.user_id);

    const apartmentId =
      Number(body.apartment_id);

    const relationType =
      String(body.relation_type);

    // duplicate protection
    const existing = await ctx.env.DB.prepare(`
      SELECT rowid
      FROM user_apartments
      WHERE
        user_id = ?
        AND apartment_id = ?
        AND relation_type = ?
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

    return {
      ok: true,
      assignment_id:
        result.meta.last_row_id
    };

  } catch (e) {

    console.error(
      "ADD ASSIGNMENT ERROR:",
      e
    );

    return {
      error: "route_error",
      message:
        String(e?.message || e)
    };
  }
});

// =========================
// REMOVE USER APARTMENT
// =========================
Router.register("POST", "/api/admin/remove-user-apartment", async (ctx) => {

  const admin = await Auth.requireAdmin(ctx);

  if (!admin) {
    return { error: "forbidden" };
  }

  const body = await ctx.request.json().catch(() => ({}));

  if (!body.assignment_id) {
    return {
      error: "missing_assignment_id"
    };
  }

  await ctx.env.DB.prepare(`
    DELETE FROM user_apartments
    WHERE rowid = ?
  `)
    .bind(body.assignment_id)
    .run();

  return {
    ok: true
  };
});
// =========================
// SIMPLE JWT (WORKER SAFE)
// =========================

async function signJWT(payload, secret) {
  const enc = new TextEncoder();

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const base64url = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const h = base64url(header);
  const p = base64url(payload);

  const data = enc.encode(h + "." + p);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, data);

  const s = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${h}.${p}.${s}`;
}

async function verifyJWT(token, secret) {

  try {

    const enc = new TextEncoder();

    const [h, p, s] = token.split(".");

    if (!h || !p || !s) {
      return null;
    }

    const data = enc.encode(h + "." + p);

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    // BASE64URL -> BASE64
    const normalize = (str) => {
      str = str
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      while (str.length % 4) {
        str += "=";
      }

      return str;
    };

    const signature = Uint8Array.from(
      atob(normalize(s)),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      data
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      atob(normalize(p))
    );

    return payload;

  } catch (e) {

    console.error("JWT VERIFY ERROR:", e);

    return null;
  }
}

// =========================
// APARTMENTS FULL
// OPTIMIZED
// Stage 2G-4: PII is read from PII_DB only.
// Main D1 provides apartment/user relationship data only.
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
      ua.user_id AS id
    FROM user_apartments ua
    WHERE ua.relation_type = 'owner'
  `).all();

  const residents = await ctx.env.DB.prepare(`
    SELECT
      ua.apartment_id,
      ua.user_id AS id
    FROM user_apartments ua
    WHERE ua.relation_type = 'resident'
  `).all();

  const ownersMap = {};
  for (const owner of (owners.results || [])) {
    if (!ownersMap[owner.apartment_id]) {
      ownersMap[owner.apartment_id] = [];
    }

    ownersMap[owner.apartment_id].push({
      id: owner.id,
    });
  }

  const residentsMap = {};
  for (const resident of (residents.results || [])) {
    if (!residentsMap[resident.apartment_id]) {
      residentsMap[resident.apartment_id] = [];
    }

    residentsMap[resident.apartment_id].push({
      id: resident.id,
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
  const encryptedBody =
    await encryptWebPushPayload(
      subscription,
      payload
    );

  const vapid =
    await createVapidJwt(
      subscription.endpoint,
      env
    );

  return await fetch(
    subscription.endpoint,
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

        const responseText =
          (
            await response.text()
          )
            .slice(
              0,
              500
            );

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
            responseText ||
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

      const errorMessage =
        String(
          error?.message ||
          error
        ).slice(
          0,
          500
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
          errorMessage,
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

    const endpoint = String(
      subscription?.endpoint || ""
    ).trim();

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

    if (!endpoint) {
      return {
        error: "push_endpoint_required",
      };
    }

    if (!p256dh || !auth) {
      return {
        error: "push_keys_required",
      };
    }

    if (
      endpoint.length > 4096 ||
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

    const endpoint = String(
      body?.endpoint || ""
    ).trim();

    if (!endpoint) {
      return {
        error: "push_endpoint_required",
      };
    }

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
