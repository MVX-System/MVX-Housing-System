const API = String(
  import.meta.env.VITE_API_BASE_URL || ""
)
  .trim()
  .replace(/\/+$/, "");

if (!API) {
  throw new Error(
    "VITE_API_BASE_URL is not configured"
  );
}

function getAuthHeaders() {
  const token =
    localStorage.getItem("token");

  return token
    ? {
        Authorization:
          `Bearer ${token}`,
      }
    : {};
}

export async function api(
  url,
  options = {}
) {
  const isFormData =
    options.body instanceof FormData;

  const res = await fetch(
    API + url,
    {
      ...options,
      headers: {
        ...(
          isFormData
            ? {}
            : {
                "Content-Type":
                  "application/json",
              }
        ),
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  return await res.json();
}

export async function apiFile(
  url,
  options = {}
) {
  return await fetch(
    API + url,
    {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );
}
