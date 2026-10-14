import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useMode,
} from "../context/ModeContext";

import {
  getDefaultPathForMode,
  isPathAllowedForMode,
} from "../access/adminCapabilities";

export default function ModeRouteBoundary({
  children,
}) {
  const {
    me,
  } = useAuth();

  const {
    mode,
  } = useMode();

  const location =
    useLocation();

  const roles =
    Array.isArray(
      me?.roles
    )
      ? me.roles
      : [];

  if (
    isPathAllowedForMode(
      location.pathname,
      mode,
      roles
    )
  ) {
    return children;
  }

  return (
    <Navigate
      to={
        getDefaultPathForMode(
          mode,
          roles
        )
      }
      replace
    />
  );
}
