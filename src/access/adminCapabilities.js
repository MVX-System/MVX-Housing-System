const RESIDENT_ROUTE_PATHS =
  new Set([
    "/",
    "/water",
    "/announcements",
    "/announcement",
    "/findings",
    "/documents",
    "/settings",
  ]);

const RESIDENT_RESTORABLE_PATHS =
  new Set([
    "/",
    "/water",
    "/announcements",
    "/findings",
    "/documents",
    "/settings",
  ]);

const FULL_ADMIN_ROUTE_PATHS =
  new Set([
    "/",
    "/users",
    "/apartments",
    "/water-meters",
    "/water-readings",
    "/monthly-report",
    "/admin-announcements",
    "/admin-findings",
    "/documents",
    "/settings",
  ]);

const BOARD_ADMIN_ROUTE_PATHS =
  new Set([
    "/users",
    "/apartments",
    "/water-meters",
    "/water-readings",
    "/documents",
    "/settings",
  ]);

export function normalizeRoles(
  roles
) {
  return Array.isArray(roles)
    ? roles
    : [];
}

export function hasResidentModeAccess(
  roles
) {
  const normalized =
    normalizeRoles(roles);

  return (
    normalized.includes(
      "resident"
    ) ||
    normalized.includes(
      "owner"
    )
  );
}

export function isFullAdmin(
  roles
) {
  return normalizeRoles(
    roles
  ).includes(
    "admin"
  );
}

export function isBoardReadOnly(
  roles
) {
  const normalized =
    normalizeRoles(roles);

  return (
    normalized.includes(
      "board_member"
    ) &&
    !normalized.includes(
      "admin"
    )
  );
}

export function hasAdminModeAccess(
  roles
) {
  return (
    isFullAdmin(
      roles
    ) ||
    isBoardReadOnly(
      roles
    )
  );
}

export function normalizeAppPath(
  pathname
) {
  const value =
    String(
      pathname || "/"
    );

  if (
    value === "/"
  ) {
    return "/";
  }

  return (
    value.replace(
      /\/+$/,
      ""
    ) || "/"
  );
}

export function isPathAllowedForMode(
  pathname,
  mode,
  roles
) {
  const path =
    normalizeAppPath(
      pathname
    );

  if (
    mode === "resident"
  ) {
    return (
      hasResidentModeAccess(
        roles
      ) &&
      RESIDENT_ROUTE_PATHS.has(
        path
      )
    );
  }

  if (
    mode !== "admin"
  ) {
    return false;
  }

  if (
    isFullAdmin(
      roles
    )
  ) {
    return (
      FULL_ADMIN_ROUTE_PATHS.has(
        path
      )
    );
  }

  if (
    isBoardReadOnly(
      roles
    )
  ) {
    return (
      BOARD_ADMIN_ROUTE_PATHS.has(
        path
      )
    );
  }

  return false;
}

export function isRestorablePathForMode(
  pathname,
  mode,
  roles
) {
  const path =
    normalizeAppPath(
      pathname
    );

  if (
    mode === "resident"
  ) {
    return (
      hasResidentModeAccess(
        roles
      ) &&
      RESIDENT_RESTORABLE_PATHS.has(
        path
      )
    );
  }

  if (
    mode !== "admin"
  ) {
    return false;
  }

  if (
    isFullAdmin(
      roles
    )
  ) {
    return (
      FULL_ADMIN_ROUTE_PATHS.has(
        path
      )
    );
  }

  if (
    isBoardReadOnly(
      roles
    )
  ) {
    return (
      BOARD_ADMIN_ROUTE_PATHS.has(
        path
      )
    );
  }

  return false;
}

export function getDefaultPathForMode(
  mode,
  roles
) {
  if (
    mode === "admin"
  ) {
    return isBoardReadOnly(
      roles
    )
      ? "/users"
      : "/";
  }

  return "/";
}
