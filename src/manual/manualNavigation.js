const CONTEXT_SECTIONS =
  Object.freeze({
    resident: Object.freeze({
      "/": "manual-section-6",
      "/water": "manual-section-7",
      "/announcements":
        "manual-section-8",
      "/announcement":
        "manual-section-8",
      "/documents":
        "manual-section-9",
      "/settings":
        "manual-section-10",
    }),
    admin: Object.freeze({
      "/": "manual-section-6",
      "/users": "manual-section-7",
      "/apartments":
        "manual-section-8",
      "/water-meters":
        "manual-section-9",
      "/water-readings":
        "manual-section-10",
      "/monthly-report":
        "manual-section-11",
      "/admin-announcements":
        "manual-section-12",
      "/documents":
        "manual-section-13",
      "/settings":
        "manual-section-14",
    }),
  });

function normalizePathname(
  pathname
) {
  const value =
    String(pathname || "/");

  if (value === "/") {
    return value;
  }

  return value.replace(
    /\/+$/,
    ""
  );
}

export function getManualContextSection({
  mode,
  pathname,
}) {
  const sections =
    CONTEXT_SECTIONS[mode];

  if (!sections) {
    return null;
  }

  return (
    sections[
      normalizePathname(
        pathname
      )
    ] || null
  );
}

export function buildManualHref({
  mode,
  pathname,
  contextual = false,
}) {
  const resolvedMode =
    mode === "admin"
      ? "admin"
      : "resident";

  const section =
    contextual
      ? getManualContextSection({
          mode: resolvedMode,
          pathname,
        })
      : null;

  const base =
    `/manual?mode=${resolvedMode}`;

  return section
    ? `${base}#${section}`
    : base;
}

let manualWindow = null;

export function openManualWindow({
  mode,
  pathname,
  contextual = false,
}) {
  const href =
    buildManualHref({
      mode,
      pathname,
      contextual,
    });

  const availableWidth =
    window.screen?.availWidth ||
    window.innerWidth;

  const availableHeight =
    window.screen?.availHeight ||
    window.innerHeight;

  const width =
    Math.max(
      420,
      Math.min(
        760,
        availableWidth - 48
      )
    );

  const height =
    Math.max(
      560,
      Math.min(
        900,
        availableHeight - 72
      )
    );

  const left =
    Math.max(
      window.screen?.availLeft || 0,
      (window.screen?.availLeft || 0) +
        availableWidth -
        width -
        24
    );

  const top =
    Math.max(
      window.screen?.availTop || 0,
      (window.screen?.availTop || 0) +
        36
    );

  const features = [
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
    `width=${Math.round(width)}`,
    `height=${Math.round(height)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(",");

  manualWindow =
    window.open(
      href,
      "mvxManualHelp",
      features
    );

  manualWindow?.focus();

  return manualWindow;
}
