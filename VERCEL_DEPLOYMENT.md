# C-Nine Vercel Deployment Handoff

## Application Preset

Select **Other** as the Vercel **Application Preset**. C-Nine is a React/Vite frontend paired with an Express and tRPC backend function; it is not a static-only Vite deployment.

Vercel uses `vercel.json` for repository configuration, not YAML. The included configuration installs with pnpm, runs the existing `pnpm build` script, serves the Vite output from `dist/public`, rewrites SPA routes to `index.html`, and sends `/api/*` calls to the Express entry point at `api/index.ts`.

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
| `NEXUSS_AUTH_REDIRECT_URI` | Exact callback: `https://c-nine.vercel.app/auth/callback`. |
| `NEXUSS_AUTH_KEY` | Project-scoped Nexuss Auth management key; server-side only. |
| External object-storage variables | A Vercel-accessible storage integration for PDF bytes and signed download URLs. |

The current Manus-injected OAuth, storage, and analytics variables are not portable to Vercel. The Nexuss Auth migration must replace the Manus OAuth routes before the production deployment is considered ready.

## User-controlled production command

After the GitHub repository is connected to Vercel and the environment variables are configured, run the production deployment command from the C-Nine repository on your own machine:

```bash
vercel --prod
```

## Post-deployment checks

Confirm that `https://c-nine.vercel.app` loads, `/api/trpc` responds, the exact Nexuss callback URL is registered in the Nexuss project, and a signed-in user can create, read, and delete only their own records. Configure the extraction scheduler only after the PDF storage and Nexuss handoff migration are verified.

## References

[1] [Vercel project configuration](https://vercel.com/docs/project-configuration)

[2] [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

[3] [Using Express with Vercel](https://vercel.com/kb/guide/using-express-with-vercel)
