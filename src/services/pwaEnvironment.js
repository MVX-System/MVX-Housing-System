const PWA_ENVIRONMENTS = Object.freeze({
  production: {
    key: "production",
    label: "PROD",
    appName: "MVX",
    manifestHref:
      "/manifest-production.webmanifest",
    iconBase:
      "/icons/production",
    themeColor:
      "#07515B",
  },
  test: {
    key: "test",
    label: "TEST",
    appName: "MVX TEST",
    manifestHref:
      "/manifest-test.webmanifest",
    iconBase:
      "/icons/test",
    themeColor:
      "#0B55D8",
  },
  demo: {
    key: "demo",
    label: "DEMO",
    appName: "MVX DEMO",
    manifestHref:
      "/manifest-demo.webmanifest",
    iconBase:
      "/icons/demo",
    themeColor:
      "#302AA8",
  },
});

function environmentFromHostname() {
  if (
    typeof window === "undefined"
  ) {
    return "production";
  }

  const hostname =
    window.location.hostname
      .toLowerCase();

  if (
    hostname ===
      "mvx-housing-system-demo.pages.dev" ||
    hostname.endsWith(
      ".mvx-housing-system-demo.pages.dev"
    )
  ) {
    return "demo";
  }

  if (
    hostname ===
      "mvx-housing-system-test.pages.dev" ||
    hostname.endsWith(
      ".mvx-housing-system-test.pages.dev"
    )
  ) {
    return "test";
  }

  return "production";
}

export function resolvePwaEnvironment(
  environment
) {
  if (
    Object.prototype.hasOwnProperty.call(
      PWA_ENVIRONMENTS,
      environment
    )
  ) {
    return environment;
  }

  return environmentFromHostname();
}

export function getPwaEnvironmentConfig(
  environment
) {
  return PWA_ENVIRONMENTS[
    resolvePwaEnvironment(
      environment
    )
  ];
}
