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
  const authUrl = import.meta.env.VITE_NEXUSS_AUTH_URL;
  const projectId = import.meta.env.VITE_NEXUSS_AUTH_PROJECT_ID;
  const redirectUri = import.meta.env.VITE_NEXUSS_AUTH_REDIRECT_URI;
  if (!authUrl || !projectId || !redirectUri) throw new Error("Nexuss Auth routing is not configured");
  window.location.assign(buildNexussLoginUrl(authUrl, projectId, redirectUri));
};
