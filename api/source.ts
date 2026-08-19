import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import { runQueuedPdfExtraction } from "../server/scheduledPdfExtraction";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.all(["/api/scheduled/extractQueuedPdfs", "/scheduled/extractQueuedPdfs"], runQueuedPdfExtraction);
const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});
// Vercel mounts `api/index.ts` under `/api` and may strip that prefix before
// invoking Express. Supporting both forms keeps local and deployed routing
// equivalent and prevents the function from falling through to a platform
// error response.
app.use(["/api/trpc", "/trpc"], trpcMiddleware);

// Keep failures inside the Express function so Vercel receives a response with
// a JSON content type rather than replacing it with its plain-text 500 page.
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error("[API] Unhandled request error", {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });

  res.status(500).json({
    error: {
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
  });
});

export default app;
