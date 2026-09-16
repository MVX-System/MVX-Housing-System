let deferredPrompt = null;

const subscribers =
  new Set();

function notify(
  event
) {
  subscribers.forEach(
    (subscriber) => {
      try {
        subscriber(event);
      } catch (error) {
        console.error(
          "MVX PWA subscriber error:",
          error
        );
      }
    }
  );
}

if (
  typeof window !== "undefined"
) {
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      deferredPrompt =
        event;

      notify({
        type: "available",
      });
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      deferredPrompt = null;

      notify({
        type: "installed",
      });
    }
  );
}

export function subscribePwaInstall(
  subscriber
) {
  subscribers.add(
    subscriber
  );

  return () => {
    subscribers.delete(
      subscriber
    );
  };
}

export function hasNativeInstallPrompt() {
  return Boolean(
    deferredPrompt
  );
}

export async function requestNativeInstall() {
  if (!deferredPrompt) {
    return {
      outcome:
        "unavailable",
    };
  }

  const promptEvent =
    deferredPrompt;

  deferredPrompt = null;

  await promptEvent.prompt();

  const choice =
    await promptEvent.userChoice;

  return {
    outcome:
      choice?.outcome ||
      "dismissed",
  };
}

export function isStandaloneMode() {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator
      .standalone === true
  );
}

export function detectInstallPlatform() {
  if (
    typeof navigator ===
      "undefined"
  ) {
    return "desktop";
  }

  const userAgent =
    navigator.userAgent || "";

  const isIpadDesktopUa =
    navigator.platform ===
      "MacIntel" &&
    navigator.maxTouchPoints >
      1;

  if (
    /iphone|ipad|ipod/i.test(
      userAgent
    ) ||
    isIpadDesktopUa
  ) {
    return "ios";
  }

  if (
    /android/i.test(
      userAgent
    )
  ) {
    return "android";
  }

  const isMac =
    /macintosh|mac os x/i.test(
      userAgent
    );

  const isSafari =
    /safari/i.test(
      userAgent
    ) &&
    !/chrome|chromium|crios|edg|edgios|opr|fxios/i.test(
      userAgent
    );

  if (
    isMac &&
    isSafari
  ) {
    return "mac-safari";
  }

  return "desktop";
}
