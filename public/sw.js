const MVX_DEFAULT_NOTIFICATION = {
  title:
    "MVX System",
  body:
    "A new urgent announcement is available.",
  url:
    "/announcements",
  tag:
    "mvx-urgent-announcement",
};

self.addEventListener(
  "install",
  () => {
    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      (async () => {
        const cacheNames =
          await caches.keys();

        await Promise.all(
          cacheNames.map(
            (cacheName) =>
              caches.delete(
                cacheName
              )
          )
        );

        await self.clients.claim();
      })()
    );
  }
);

self.addEventListener(
  "push",
  (event) => {
    let payload = {
      ...MVX_DEFAULT_NOTIFICATION,
    };

    if (event.data) {
      try {
        const received =
          event.data.json();

        payload = {
          ...payload,
          ...(received || {}),
        };
      } catch {
        const text =
          event.data.text();

        if (text) {
          payload.body = text;
        }
      }
    }

    const title =
      String(
        payload.title ||
        MVX_DEFAULT_NOTIFICATION
          .title
      );

    const body =
      String(
        payload.body ||
        MVX_DEFAULT_NOTIFICATION
          .body
      );

    const url =
      String(
        payload.url ||
        MVX_DEFAULT_NOTIFICATION
          .url
      );

    const tag =
      String(
        payload.tag ||
        MVX_DEFAULT_NOTIFICATION
          .tag
      );

    const notificationOptions = {
      body,
      tag,
      renotify: true,
      requireInteraction: true,

      icon:
        "/favicon.svg",

      badge:
        "/favicon.svg",

      data: {
        url,
        announcement_id:
          payload
            .announcement_id ||
          null,
      },
    };

    event.waitUntil(
      self.registration
        .showNotification(
          title,
          notificationOptions
        )
    );
  }
);

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      new URL(
        event.notification
          ?.data
          ?.url ||
        MVX_DEFAULT_NOTIFICATION
          .url,
        self.location.origin
      ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(
          async (
            windowClients
          ) => {
            for (
              const client of
              windowClients
            ) {
              if (
                "focus" in client
              ) {
                await client
                  .navigate(
                    targetUrl
                  );

                return client
                  .focus();
              }
            }

            if (
              self.clients
                .openWindow
            ) {
              return self.clients
                .openWindow(
                  targetUrl
                );
            }

            return null;
          }
        )
    );
  }
);
