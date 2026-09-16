import {
  useEffect,
} from "react";

import {
  useFacility,
} from "./FacilityContext";

import {
  getPwaEnvironmentConfig,
} from "../services/pwaEnvironment";

function upsertLink(
  id,
  attributes
) {
  let element =
    document.getElementById(id);

  if (!element) {
    element =
      document.createElement(
        "link"
      );
    element.id = id;
    document.head.appendChild(
      element
    );
  }

  Object.entries(
    attributes
  ).forEach(
    ([key, value]) => {
      element.setAttribute(
        key,
        value
      );
    }
  );

  return element;
}

function upsertMeta(
  name,
  content
) {
  let element =
    document.querySelector(
      `meta[name="${name}"]`
    );

  if (!element) {
    element =
      document.createElement(
        "meta"
      );
    element.setAttribute(
      "name",
      name
    );
    document.head.appendChild(
      element
    );
  }

  element.setAttribute(
    "content",
    content
  );
}

export default function EnvironmentPwaBridge({
  children,
}) {
  const {
    environment,
  } = useFacility();

  useEffect(() => {
    const config =
      getPwaEnvironmentConfig(
        environment
      );

    document
      .querySelectorAll(
        'link[rel="manifest"]'
      )
      .forEach((element) => {
        if (
          element.id !==
          "mvx-pwa-manifest"
        ) {
          element.remove();
        }
      });

    document
      .querySelectorAll(
        'link[rel="apple-touch-icon"]'
      )
      .forEach((element) => {
        if (
          element.id !==
          "mvx-apple-touch-icon"
        ) {
          element.remove();
        }
      });

    document
      .querySelectorAll(
        'link[rel="icon"]'
      )
      .forEach((element) => {
        if (
          element.id !==
          "mvx-favicon"
        ) {
          element.remove();
        }
      });

    upsertLink(
      "mvx-pwa-manifest",
      {
        rel: "manifest",
        href:
          config.manifestHref,
      }
    );

    upsertLink(
      "mvx-apple-touch-icon",
      {
        rel:
          "apple-touch-icon",
        sizes: "180x180",
        href:
          `${config.iconBase}/apple-touch-icon.png`,
      }
    );

    upsertLink(
      "mvx-favicon",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href:
          `${config.iconBase}/favicon-32.png`,
      }
    );

    upsertMeta(
      "theme-color",
      config.themeColor
    );

    upsertMeta(
      "mobile-web-app-capable",
      "yes"
    );

    upsertMeta(
      "apple-mobile-web-app-capable",
      "yes"
    );

    upsertMeta(
      "apple-mobile-web-app-status-bar-style",
      "default"
    );

    upsertMeta(
      "apple-mobile-web-app-title",
      config.appName
    );
  }, [environment]);

  return children;
}
