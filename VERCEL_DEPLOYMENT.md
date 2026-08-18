# C-Nine Vercel Deployment Handoff

## Application Preset

Select **Other** as the Vercel **Application Preset**. C-Nine is a React/Vite frontend paired with an Express and tRPC backend function; it is not a static-only Vite deployment.

Vercel uses `vercel.json` for repository configuration, not YAML. The included configuration installs with pnpm, runs the existing `pnpm build` script, serves the Vite output from `dist/public`, rewrites SPA routes to `index.html`, and sends `/api/*` calls to the Express entry point at `api/index.ts`. The exact Nexuss callback is routed to the server before the SPA catch-all rewrite so the one-time handoff token never enters frontend code.

| Vercel dashboard field | Value |
|---|---|
| Application Preset | **Other** |
| Root Directory | `.` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |
| Node.js Version | 22.x |

## Required environment variables

Set all values in the **Production** environment before creating the production deployment. Do not add any secret with a `VITE_` prefix unless it is explicitly public configuration.

| Variable | Use |
|---|---|
| `DATABASE_URL` | Externally reachable, serverless-safe MySQL connection string for the Drizzle data store. |
| `JWT_SECRET` | Application session signing secret. |
| `NEXUSS_AUTH_URL` | Nexuss Auth service origin. |
| `NEXUSS_AUTH_PROJECT_ID` | Dedicated C-Nine Nexuss Auth project ID. |
| `NEXUSS_AUTH_REDIRECT_URI` | Exact callback: `https://c-nine-study.vercel.app/auth/callback` for the current production deployment. |
| `VITE_NEXUSS_AUTH_URL` | Public Nexuss Auth service origin, normally `https://nexuss-auth.vercel.app`. |
| `VITE_NEXUSS_AUTH_PROJECT_ID` | Public C-Nine Nexuss project identifier: `c-nine-study`. |
| `VITE_NEXUSS_AUTH_REDIRECT_URI` | Public exact callback: `https://c-nine-study.vercel.app/auth/callback`. |
| `CRON_SECRET` | Random server-only value used by Vercel to authorize the daily queued PDF extraction route. |
| External object-storage variables | A Vercel-accessible storage integration for PDF bytes and signed download URLs. |

`NEXUSS_AUTH_KEY` is a project-management credential used by the trusted CLI workflow only. Do **not** set it in Vercel because the deployed C-Nine handoff exchange does not need it. The current Manus storage proxy must be replaced with a Vercel-accessible object-storage adapter before PDF uploads can work on the external deployment.

## User-controlled production command

After the GitHub repository is connected to Vercel and the environment variables are configured, run the production deployment command from the C-Nine repository on your own machine:

```bash
vercel --prod
```

## Post-deployment checks

Confirm that `https://c-nine-study.vercel.app` loads, `/api/trpc` responds with JSON, the exact Nexuss callback URL is registered in the Nexuss project, and a signed-in user can create, read, and delete only their own records. The included Vercel configuration invokes queued extraction daily at 03:00 UTC; Vercel uses `CRON_SECRET` to authorize the request. Verify the cron invocation in the Vercel dashboard after a production deployment.

## References

[1] [Vercel project configuration](https://vercel.com/docs/project-configuration)

[2] [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

[3] [Using Express with Vercel](https://vercel.com/kb/guide/using-express-with-vercel)
