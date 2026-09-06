import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import "./index.css";

import {
  RouterProvider,
} from "react-router-dom";

import {
  router,
} from "./router/router";

import {
  FacilityProvider,
} from "./context/FacilityContext";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  ModeProvider,
} from "./context/ModeContext";

import {
  LanguageProvider,
} from "./i18n";

function ensureWebAppManifest() {
  const existingManifest =
    document.querySelector(
      'link[rel="manifest"]'
    );

  if (existingManifest) {
    return;
  }

  const manifestLink =
    document.createElement(
      "link"
    );

  manifestLink.rel =
    "manifest";

  manifestLink.href =
    "/manifest.webmanifest";

  document.head.appendChild(
    manifestLink
  );
}

async function registerServiceWorker() {
  if (
    !(
      "serviceWorker"
      in navigator
    )
  ) {
    return null;
  }

  try {
    const registration =
      await navigator
        .serviceWorker
        .register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache:
              "none",
          }
        );

    console.log(
      "MVX service worker registered:",
      registration.scope
    );

    return registration;
  } catch (error) {
    console.error(
      "MVX service worker registration failed:",
      error
    );

    return null;
  }
}

ensureWebAppManifest();

window.addEventListener(
  "load",
  () => {
    registerServiceWorker();
  }
);

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <LanguageProvider>
      <FacilityProvider>
        <AuthProvider>
          <ModeProvider>
            <RouterProvider
              router={router}
            />
          </ModeProvider>
        </AuthProvider>
      </FacilityProvider>
    </LanguageProvider>
  </StrictMode>
);
