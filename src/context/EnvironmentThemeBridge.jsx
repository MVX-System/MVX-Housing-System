import {
  useEffect,
} from "react";

import {
  useFacility,
} from "./FacilityContext";

const KNOWN_ENVIRONMENTS =
  new Set([
    "production",
    "test",
    "demo",
  ]);

export default function EnvironmentThemeBridge({
  children,
}) {
  const {
    environment,
  } = useFacility();

  useEffect(() => {
    const root =
      document.documentElement;

    if (
      KNOWN_ENVIRONMENTS.has(
        environment
      )
    ) {
      root.dataset.environment =
        environment;
    } else {
      delete root.dataset.environment;
    }

    return () => {
      delete root.dataset.environment;
    };
  }, [environment]);

  return children;
}
