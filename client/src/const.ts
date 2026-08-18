export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export function buildNexussLoginUrl(authUrl: string, projectId: string, redirectUri: string) {
  const url = new URL("/oauth/start/google", authUrl);
  url.searchParams.set("project_id", projectId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("handoff", "1");
  return url.toString();
}

/** Starts a Nexuss Auth Google sign-in as browser navigation with server handoff. */
export const startLogin = () => {
  // These values are public routing configuration, not credentials. The
  // environment variables remain overridable for previews and custom domains.
  const authUrl = import.meta.env.VITE_NEXUSS_AUTH_URL || "https://nexuss-auth.vercel.app";
  const projectId = import.meta.env.VITE_NEXUSS_AUTH_PROJECT_ID || "c-nine-study";
  const redirectUri = import.meta.env.VITE_NEXUSS_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  window.location.assign(buildNexussLoginUrl(authUrl, projectId, redirectUri));
};
