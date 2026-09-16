import {
  defineConfig,
  loadEnv,
} from "vite";

import process
  from "node:process";

import react
  from "@vitejs/plugin-react";

const PWA_ENVIRONMENTS = {
  production: {
    manifest:
      "/manifest-production.webmanifest",
    appleTouchIcon:
      "/icons/production/apple-touch-icon.png",
    favicon:
      "/icons/production/favicon-32.png",
    themeColor:
      "#245A8D",
    appTitle:
      "MVX",
  },
  test: {
    manifest:
      "/manifest-test.webmanifest",
    appleTouchIcon:
      "/icons/test/apple-touch-icon.png",
    favicon:
      "/icons/test/favicon-32.png",
    themeColor:
      "#147D86",
    appTitle:
      "MVX TEST",
  },
  demo: {
    manifest:
      "/manifest-demo.webmanifest",
    appleTouchIcon:
      "/icons/demo/apple-touch-icon.png",
    favicon:
      "/icons/demo/favicon-32.png",
    themeColor:
      "#5B57A6",
    appTitle:
      "MVX DEMO",
  },
};

function normalizeEnvironment(
  rawValue
) {
  const value =
    String(
      rawValue || ""
    )
      .trim()
      .toLowerCase();

  if (
    value === "prod" ||
    value === "production"
  ) {
    return "production";
  }

  if (
    value === "test"
  ) {
    return "test";
  }

  if (
    value === "demo"
  ) {
    return "demo";
  }

  return null;
}

function resolvePwaEnvironment(
  mode
) {
  const env =
    loadEnv(
      mode,
      process.cwd(),
      ""
    );

  if (
    env.VITE_MVX_ENV
  ) {
    const explicit =
      normalizeEnvironment(
        env.VITE_MVX_ENV
      );

    if (!explicit) {
      throw new Error(
        `Unsupported VITE_MVX_ENV: ${env.VITE_MVX_ENV}`
      );
    }

    return explicit;
  }

  const apiBase =
    String(
      env.VITE_API_BASE_URL ||
      ""
    ).toLowerCase();

  if (
    apiBase.includes(
      "mvx-housing-api-demo"
    )
  ) {
    return "demo";
  }

  if (
    apiBase.includes(
      "mvx-housing-api-test"
    )
  ) {
    return "test";
  }

  return "production";
}

function mvxPwaHtmlPlugin(
  environment
) {
  const config =
    PWA_ENVIRONMENTS[
      environment
    ];

  return {
    name:
      "mvx-pwa-html",

    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: {
            id:
              "mvx-pwa-manifest",
            rel:
              "manifest",
            href:
              config.manifest,
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "link",
          attrs: {
            id:
              "mvx-apple-touch-icon",
            rel:
              "apple-touch-icon",
            sizes:
              "180x180",
            href:
              config.appleTouchIcon,
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "link",
          attrs: {
            id:
              "mvx-favicon",
            rel:
              "icon",
            type:
              "image/png",
            sizes:
              "32x32",
            href:
              config.favicon,
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "meta",
          attrs: {
            name:
              "theme-color",
            content:
              config.themeColor,
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "meta",
          attrs: {
            name:
              "mobile-web-app-capable",
            content:
              "yes",
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "meta",
          attrs: {
            name:
              "apple-mobile-web-app-capable",
            content:
              "yes",
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "meta",
          attrs: {
            name:
              "apple-mobile-web-app-status-bar-style",
            content:
              "default",
          },
          injectTo:
            "head-prepend",
        },
        {
          tag: "meta",
          attrs: {
            name:
              "apple-mobile-web-app-title",
            content:
              config.appTitle,
          },
          injectTo:
            "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig(
  ({ mode }) => {
    const environment =
      resolvePwaEnvironment(
        mode
      );

    console.log(
      `[MVX PWA] build environment: ${environment}`
    );

    return {
      plugins: [
        react(),
        mvxPwaHtmlPlugin(
          environment
        ),
      ],
    };
  }
);
