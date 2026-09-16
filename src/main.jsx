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
  PublicContactProvider,
} from "./context/PublicContactContext";

import EnvironmentThemeBridge
  from "./context/EnvironmentThemeBridge";

import EnvironmentPwaBridge
  from "./context/EnvironmentPwaBridge";

import AppInstallPrompt
  from "./components/AppInstallPrompt";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  ModeProvider,
} from "./context/ModeContext";

import {
  LanguageProvider,
} from "./i18n";

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
        <EnvironmentThemeBridge>
          <EnvironmentPwaBridge>
            <AppInstallPrompt />
            <PublicContactProvider>
            <AuthProvider>
            <ModeProvider>
              <RouterProvider
                router={router}
              />
            </ModeProvider>
            </AuthProvider>
          </PublicContactProvider>
          </EnvironmentPwaBridge>
        </EnvironmentThemeBridge>
      </FacilityProvider>
    </LanguageProvider>
  </StrictMode>
);
