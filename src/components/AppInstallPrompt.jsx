import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useFacility,
} from "../context/FacilityContext";

import {
  useTranslation,
} from "../i18n";

import {
  getPwaEnvironmentConfig,
  resolvePwaEnvironment,
} from "../services/pwaEnvironment";

import {
  detectInstallPlatform,
  hasNativeInstallPrompt,
  isStandaloneMode,
  requestNativeInstall,
  subscribePwaInstall,
} from "../services/pwaInstall";

import "./AppInstallPrompt.css";

const SHOW_DELAY_MS = 1200;

function completedKey(
  environment
) {
  return (
    "mvx:pwa-install:" +
    "completed:v1:" +
    environment
  );
}

function dismissedKey(
  environment
) {
  return (
    "mvx:pwa-install:" +
    "dismissed-session:v1:" +
    environment
  );
}

function safeGet(
  storage,
  key
) {
  try {
    return storage.getItem(
      key
    );
  } catch {
    return null;
  }
}

function restoreApplicationFocus() {
  window.requestAnimationFrame(
    () => {
      const root =
        document.getElementById(
          "root"
        );

      if (!root) {
        window.focus();
        return;
      }

      if (
        !root.hasAttribute(
          "tabindex"
        )
      ) {
        root.setAttribute(
          "tabindex",
          "-1"
        );
      }

      window.focus();

      root.focus({
        preventScroll: true,
      });
    }
  );
}

function safeSet(
  storage,
  key,
  value
) {
  try {
    storage.setItem(
      key,
      value
    );
  } catch {
    // Storage may be unavailable
    // in a restricted browser mode.
  }
}

export default function AppInstallPrompt() {
  const {
    environment,
  } = useFacility();

  const {
    t,
  } = useTranslation();

  const resolvedEnvironment =
    resolvePwaEnvironment(
      environment
    );

  const config =
    useMemo(
      () =>
        getPwaEnvironmentConfig(
          resolvedEnvironment
        ),
      [resolvedEnvironment]
    );

  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    guideOpen,
    setGuideOpen,
  ] = useState(false);

  const [
    nativeAvailable,
    setNativeAvailable,
  ] = useState(
    hasNativeInstallPrompt()
  );

  const platform =
    useMemo(
      () =>
        detectInstallPlatform(),
      []
    );

  useEffect(() => {
    const completeKey =
      completedKey(
        resolvedEnvironment
      );

    const sessionKey =
      dismissedKey(
        resolvedEnvironment
      );

    if (
      isStandaloneMode()
    ) {
      safeSet(
        window.localStorage,
        completeKey,
        "1"
      );
      return undefined;
    }

    if (
      safeGet(
        window.localStorage,
        completeKey
      ) === "1"
    ) {
      return undefined;
    }

    if (
      safeGet(
        window.sessionStorage,
        sessionKey
      ) === "1"
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setVisible(true);
        },
        SHOW_DELAY_MS
      );

    const unsubscribe =
      subscribePwaInstall(
        (event) => {
          if (
            event.type ===
            "available"
          ) {
            setNativeAvailable(
              true
            );
          }

          if (
            event.type ===
            "installed"
          ) {
            safeSet(
              window.localStorage,
              completeKey,
              "1"
            );
            setVisible(false);
            setGuideOpen(false);
          }
        }
      );

    return () => {
      window.clearTimeout(
        timer
      );
      unsubscribe();
    };
  }, [resolvedEnvironment]);

  if (
    !visible &&
    !guideOpen
  ) {
    return null;
  }

  const markCompleted =
    () => {
      safeSet(
        window.localStorage,
        completedKey(
          resolvedEnvironment
        ),
        "1"
      );
      setVisible(false);
      setGuideOpen(false);
    };

  const dismissForSession =
    () => {
      safeSet(
        window.sessionStorage,
        dismissedKey(
          resolvedEnvironment
        ),
        "1"
      );
      setVisible(false);
      setGuideOpen(false);

      restoreApplicationFocus();
    };

  const install =
    async () => {
      if (
        nativeAvailable ||
        hasNativeInstallPrompt()
      ) {
        const result =
          await requestNativeInstall();

        setNativeAvailable(
          hasNativeInstallPrompt()
        );

        if (
          result.outcome ===
          "accepted"
        ) {
          markCompleted();
          return;
        }

        if (
          result.outcome ===
          "dismissed"
        ) {
          dismissForSession();
          return;
        }
      }

      setGuideOpen(true);
    };

  const guideKey =
    platform === "ios"
      ? "ios"
      : platform ===
          "mac-safari"
        ? "macSafari"
        : platform ===
            "android"
          ? "android"
          : "desktop";

  return (
    <>
      {visible && (
        <aside
          className={
            `mvx-install-prompt mvx-install-prompt--${resolvedEnvironment}`
          }
          aria-labelledby=
            "mvx-install-title"
        >
          <img
            className="mvx-install-prompt__icon"
            src={
              `${config.iconBase}/icon-192.png`
            }
            alt=""
            aria-hidden="true"
          />

          <div
            className="mvx-install-prompt__body"
          >
            <div
              id="mvx-install-title"
              className="mvx-install-prompt__title"
            >
              {t(
                "login.install.title"
              )}
            </div>

            <div
              className="mvx-install-prompt__text"
            >
              {t(
                "login.install.message"
              )}
            </div>
          </div>

          <div
            className="mvx-install-prompt__actions"
          >
            <button
              type="button"
              className="mvx-install-prompt__button mvx-install-prompt__button--secondary"
              onClick={
                dismissForSession
              }
            >
              {t(
                "login.install.notNow"
              )}
            </button>

            <button
              type="button"
              className="mvx-install-prompt__button mvx-install-prompt__button--primary"
              onClick={install}
            >
              {t(
                "login.install.install"
              )}
            </button>
          </div>
        </aside>
      )}

      {guideOpen && (
        <div
          className="mvx-install-guide-backdrop"
          role="presentation"
          onClick={() =>
            setGuideOpen(
              false
            )
          }
        >
          <div
            className="mvx-install-guide"
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "mvx-install-guide-title"
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >
            <img
              className="mvx-install-guide__icon"
              src={
                `${config.iconBase}/icon-192.png`
              }
              alt=""
              aria-hidden="true"
            />

            <h2
              id="mvx-install-guide-title"
            >
              {t(
                "login.install.guideTitle"
              )}
            </h2>

            <p>
              {t(
                `login.install.guides.${guideKey}`
              )}
            </p>

            <div
              className="mvx-install-guide__actions"
            >
              <button
                type="button"
                className="mvx-install-prompt__button mvx-install-prompt__button--secondary"
                onClick={dismissForSession}
              >
                {t(
                  "login.install.back"
                )}
              </button>

              <button
                type="button"
                className="mvx-install-prompt__button mvx-install-prompt__button--primary"
                onClick={
                  markCompleted
                }
              >
                {t(
                  "login.install.done"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
