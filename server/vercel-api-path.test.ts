import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import app from "../api/index";

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

async function request(path: string) {
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine test port");
  return fetch(`http://127.0.0.1:${address.port}${path}`);
}

describe("Vercel API routing", () => {
  it.each(["/api/trpc/auth.me", "/trpc/auth.me"])("returns JSON from %s", async path => {
    const input = encodeURIComponent(JSON.stringify({
      0: { json: null, meta: { values: ["undefined"] } },
    }));
    const response = await request(`${path}?batch=1&input=${input}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual([{ result: { data: { json: null } } }]);
  });
});
