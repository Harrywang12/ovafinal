const AUTH_PATHS = new Set(["/login", "/forgot-password", "/reset-password", "/auth/callback"]);

export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001F\u007F]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || AUTH_PATHS.has(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
