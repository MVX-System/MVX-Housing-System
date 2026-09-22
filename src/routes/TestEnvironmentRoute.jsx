import {
  Navigate,
} from "react-router-dom";

import {
  useFacility,
} from "../context/FacilityContext";


export default function TestEnvironmentRoute({
  children,
  fallbackPath = "/",
}) {

  const {
    environment,
    loading,
  } = useFacility();

  if (loading) {
    return null;
  }

  if (
    environment !==
      "test"
  ) {
    return (
      <Navigate
        to={fallbackPath}
        replace
      />
    );
  }

  return children;
}
