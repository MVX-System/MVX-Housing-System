const API =
  "https://mvx-housing-api.mvx-system.workers.dev/";

export async function api(
  token,
  url,
  options = {}
) {
  const res = await fetch(API + url, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      Authorization:
        token
          ? "Bearer " + token
          : "",

      ...(options.headers || {}),
    },
  });

  return await res.json();
}
