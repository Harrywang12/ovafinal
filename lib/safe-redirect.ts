const AUTH_PATHS = new Set(["/login", "/forgot-password", "/reset-password", "/auth/callback"]);

function normalizeLocalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001F\u007F]/.test(value)) {
    return null;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  const path = normalizeLocalPath(value);
  if (!path || AUTH_PATHS.has(new URL(path, "https://local.invalid").pathname)) return fallback;
  return path;
}

/**
 * Auth callbacks may complete a recovery flow at the reset form. Other auth
 * pages remain forbidden so a callback cannot create a redirect loop.
 */
export function safeAuthCallbackRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  const path = normalizeLocalPath(value);
  if (!path) return fallback;

  const pathname = new URL(path, "https://local.invalid").pathname;
  if (AUTH_PATHS.has(pathname) && pathname !== "/reset-password") return fallback;
  return path;
}
