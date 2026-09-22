import {
  api,
  apiFile,
} from "../services/api";

import {
  getBuildCommitSha,
} from "../services/buildIdentity";


export const FINDING_TYPES =
  Object.freeze([
    "Bug",
    "Usability/UX",
    "Text/translation",
    "Documentation",
    "Suggestion",
  ]);


export const FINDING_STATUSES =
  Object.freeze([
    "NEW",
    "APPROVED",
    "NEEDS_INFO",
    "HOLD",
    "IN_PROGRESS",
    "READY_FOR_RETEST",
    "VERIFIED",
    "CLOSED",
  ]);


export const FINDING_CLOSED_REASONS =
  Object.freeze([
    "duplicate",
    "expected_behaviour",
    "not_reproduced",
    "test_data_issue",
    "documentation_issue",
    "wont_fix",
  ]);


export const FINDING_SCREENSHOT_MAX_SIZE_BYTES =
  5 * 1024 * 1024;


export const FINDING_SCREENSHOT_MIME_TYPES =
  Object.freeze([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);


function normalizePositiveInteger(
  value,
  fieldName = "id"
) {

  const normalized =
    Number(
      value
    );

  if (
    !Number.isInteger(
      normalized
    ) ||
    normalized <= 0
  ) {
    throw new Error(
      `invalid_${fieldName}`
    );
  }

  return normalized;
}


function withQuery(
  path,
  params = {}
) {

  const search =
    new URLSearchParams();

  for (
    const [
      key,
      rawValue,
    ]
    of Object.entries(
      params || {}
    )
  ) {

    if (
      rawValue === undefined ||
      rawValue === null ||
      rawValue === ""
    ) {
      continue;
    }

    const values =
      Array.isArray(
        rawValue
      )
        ? rawValue
        : [rawValue];

    for (
      const value
      of values
    ) {

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue;
      }

      search.append(
        key,
        String(value)
      );
    }
  }

  const serialized =
    search.toString();

  return serialized
    ? `${path}?${serialized}`
    : path;
}


function postJson(
  path,
  payload
) {

  return api(
    path,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload || {}
        ),
    }
  );
}


export function getFindingRuntimeContext({
  authorMode,
  language,
  route,
} = {}) {

  const browser =
    typeof navigator !==
      "undefined"
      ? String(
          navigator.userAgent ||
          ""
        )
      : "";

  const operatingSystem =
    typeof navigator !==
      "undefined"
      ? String(
          navigator.userAgentData
            ?.platform ||
          navigator.platform ||
          ""
        )
      : "";

  const routeValue =
    route ||
    (
      typeof window !==
        "undefined"
        ? (
            window.location
              ?.pathname ||
            "/"
          )
        : "/"
    );

  const screenWidth =
    typeof window !==
      "undefined"
      ? Number(
          window.screen
            ?.width ||
          window.innerWidth ||
          0
        )
      : 0;

  const screenHeight =
    typeof window !==
      "undefined"
      ? Number(
          window.screen
            ?.height ||
          window.innerHeight ||
          0
        )
      : 0;

  return {
    author_mode:
      String(
        authorMode ||
        "resident"
      ),

    route:
      String(
        routeValue ||
        "/"
      ),

    language:
      String(
        language ||
        "lv"
      ),

    app_commit_sha:
      getBuildCommitSha(),

    browser:
      browser || null,

    operating_system:
      operatingSystem || null,

    screen_width:
      Number.isFinite(
        screenWidth
      ) &&
      screenWidth > 0
        ? Math.trunc(
            screenWidth
          )
        : null,

    screen_height:
      Number.isFinite(
        screenHeight
      ) &&
      screenHeight > 0
        ? Math.trunc(
            screenHeight
          )
        : null,
  };
}


// =========================
// TESTER FINDINGS
// =========================

export function createTestFinding(
  finding,
  context = {}
) {

  return postJson(
    "/api/test/findings",
    {
      ...finding,

      ...getFindingRuntimeContext(
        context
      ),
    }
  );
}


export function getMyTestFindings(
  params = {}
) {

  return api(
    withQuery(
      "/api/test/findings",
      params
    )
  );
}


export function getMyTestFinding(
  findingId
) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  return api(
    withQuery(
      "/api/test/finding",
      {
        id,
      }
    )
  );
}


export function addTestFindingInfo({
  findingId,
  comment,
} = {}) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  return postJson(
    "/api/test/finding/info",
    {
      finding_id: id,

      comment:
        String(
          comment ||
          ""
        ),
    }
  );
}


// =========================
// TESTER RETEST
// =========================

export function getMyTestRetests(
  params = {}
) {

  return api(
    withQuery(
      "/api/test/retests",
      params
    )
  );
}


export function submitTestRetest({
  retestId,
  outcome,
  comment,
} = {}) {

  const id =
    normalizePositiveInteger(
      retestId,
      "retest_id"
    );

  return postJson(
    "/api/test/retest",
    {
      retest_id: id,

      outcome:
        String(
          outcome ||
          ""
        ),

      comment:
        String(
          comment ||
          ""
        ),
    }
  );
}


// =========================
// ADMIN FINDINGS
// =========================

export function getAdminTestFindings(
  params = {}
) {

  return api(
    withQuery(
      "/api/admin/test/findings",
      params
    )
  );
}


export function getAdminTestFinding(
  findingId
) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  return api(
    withQuery(
      "/api/admin/test/finding",
      {
        id,
      }
    )
  );
}


export function setAdminTestFindingStatus(
  payload
) {

  return postJson(
    "/api/admin/test/finding/status",
    payload
  );
}


export function requestAdminTestFindingInfo(
  payload
) {

  return postJson(
    "/api/admin/test/finding/request-info",
    payload
  );
}


export function assignAdminTestFindingRetest(
  payload
) {

  return postJson(
    "/api/admin/test/finding/retest",
    payload
  );
}


export function updateAdminTestFindingImplementation(
  payload
) {

  return postJson(
    "/api/admin/test/finding/implementation",
    payload
  );
}


// =========================
// SCREENSHOT EVIDENCE
// =========================

function validateScreenshotFile(
  file
) {

  if (
    !file ||
    typeof file !==
      "object"
  ) {
    throw new Error(
      "invalid_screenshot_file"
    );
  }

  const mimeType =
    String(
      file.type ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    !FINDING_SCREENSHOT_MIME_TYPES
      .includes(
        mimeType
      )
  ) {
    throw new Error(
      "invalid_screenshot_mime_type"
    );
  }

  const size =
    Number(
      file.size
    );

  if (
    !Number.isFinite(
      size
    ) ||
    size <= 0
  ) {
    throw new Error(
      "invalid_screenshot_size"
    );
  }

  if (
    size >
      FINDING_SCREENSHOT_MAX_SIZE_BYTES
  ) {
    throw new Error(
      "screenshot_too_large"
    );
  }

  return {
    mimeType,
    size,
  };
}


export async function uploadTestFindingScreenshot(
  findingId,
  file
) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  const {
    mimeType,
  } =
    validateScreenshotFile(
      file
    );

  const response =
    await apiFile(
      withQuery(
        "/api/test/finding/screenshot",
        {
          id,
        }
      ),
      {
        method: "POST",

        headers: {
          "Content-Type":
            mimeType,
        },

        body: file,
      }
    );

  const contentType =
    String(
      response.headers
        ?.get(
          "Content-Type"
        ) ||
      ""
    ).toLowerCase();

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  if (!response.ok) {
    return {
      error:
        "screenshot_upload_failed",
    };
  }

  return {
    ok: true,
  };
}


export function getMyTestFindingScreenshot(
  findingId
) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  return apiFile(
    withQuery(
      "/api/test/finding/screenshot",
      {
        id,
      }
    )
  );
}


export function getAdminTestFindingScreenshot(
  findingId
) {

  const id =
    normalizePositiveInteger(
      findingId,
      "finding_id"
    );

  return apiFile(
    withQuery(
      "/api/admin/test/finding/screenshot",
      {
        id,
      }
    )
  );
}


export async function readFindingScreenshotResponse(
  response
) {

  if (
    !response ||
    typeof response !==
      "object"
  ) {
    throw new Error(
      "invalid_screenshot_response"
    );
  }

  const contentType =
    String(
      response.headers
        ?.get(
          "Content-Type"
        ) ||
      ""
    )
      .toLowerCase();

  if (
    contentType.includes(
      "application/json"
    )
  ) {

    const payload =
      await response.json();

    return {
      ok: false,

      error:
        payload?.error ||
        "screenshot_load_failed",

      payload,

      blob: null,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        "screenshot_load_failed",
      payload: null,
      blob: null,
    };
  }

  const blob =
    await response.blob();

  return {
    ok: true,
    error: null,
    payload: null,
    blob,
  };
}
